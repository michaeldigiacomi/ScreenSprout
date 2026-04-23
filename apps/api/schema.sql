-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    email VARCHAR(100),
    bio TEXT,
    password_hash VARCHAR(255) NOT NULL,
    default_policy_json JSONB DEFAULT '{"dailyLimitMinutes": 120, "blockedApps": [], "alwaysAllowedApps": []}',
    theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Shared Access / Delegation table
CREATE TABLE IF NOT EXISTS shared_access (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    viewer_email VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner_id, viewer_email)
);

-- Children table
CREATE TABLE IF NOT EXISTS children (
    id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    daily_limit_minutes INTEGER DEFAULT 120,
    blocked_apps JSONB DEFAULT '[]',
    always_allowed_apps JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    child_id UUID REFERENCES children(id), -- Link to child (optional)
    device_name VARCHAR(100),
    device_type VARCHAR(20) CHECK (device_type IN ('android', 'ios', 'windows', 'macos', 'visionos', 'linux')),
    last_seen TIMESTAMP WITH TIME ZONE,
    policy_json JSONB, -- Cache/Override
    family_selection_data TEXT, -- Base64-encoded FamilyActivitySelection (iOS)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    device_id UUID REFERENCES devices(id),
    app_name VARCHAR(255) NOT NULL,
    duration_seconds INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Policies table (Global or User specific)
CREATE TABLE IF NOT EXISTS policies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id), -- Null for global default
    device_id UUID REFERENCES devices(id), -- Null for user-wide
    rules JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schedules table for time-based rules
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    days_of_week INTEGER[] NOT NULL, -- [0,1,2,3,4,5,6] for Sun-Sat
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    blocked_apps JSONB DEFAULT '[]',
    always_allowed_apps JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient schedule lookups
CREATE INDEX IF NOT EXISTS idx_schedules_child_id ON schedules(child_id);
CREATE INDEX IF NOT EXISTS idx_schedules_active ON schedules(is_active);

-- Notifications table for real-time alerts
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient notification lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Device Status table for real-time monitoring
CREATE TABLE IF NOT EXISTS device_status (
    device_id UUID PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    is_online BOOLEAN DEFAULT false,
    current_app VARCHAR(255),
    battery_level INTEGER,
    battery_charging BOOLEAN DEFAULT false,
    ip_address INET,
    os_version VARCHAR(100),
    client_version VARCHAR(50),
    paused_until TIMESTAMP WITH TIME ZONE,
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    connection_quality VARCHAR(20) DEFAULT 'unknown', -- excellent, good, fair, poor, offline
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for online device queries
CREATE INDEX IF NOT EXISTS idx_device_status_online ON device_status(is_online) WHERE is_online = true;

-- Parent messages table for device communication
CREATE TABLE IF NOT EXISTS device_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_device_messages_device ON device_messages(device_id, is_read) WHERE is_read = false;

-- Bonus Time Grants table for rewards system
CREATE TABLE IF NOT EXISTS bonus_time_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    granted_by INTEGER NOT NULL REFERENCES users(id),
    minutes INTEGER NOT NULL CHECK (minutes > 0),
    reason VARCHAR(255),
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for bonus time lookups
CREATE INDEX IF NOT EXISTS idx_bonus_time_child_id ON bonus_time_grants(child_id);
CREATE INDEX IF NOT EXISTS idx_bonus_time_unused ON bonus_time_grants(child_id, is_used) WHERE is_used = false;
CREATE INDEX IF NOT EXISTS idx_bonus_time_expires ON bonus_time_grants(expires_at);

-- ============================================
-- GOALS & REWARDS SYSTEM
-- ============================================

-- Goals table for screen time targets
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('daily_limit', 'app_limit', 'streak')),
    target_value INTEGER NOT NULL, -- minutes for time-based, count for streak
    target_app VARCHAR(100), -- specific app for app_limit goals
    points_reward INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Goal progress tracking
CREATE TABLE IF NOT EXISTS goal_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    current_value INTEGER DEFAULT 0,
    target_value INTEGER NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(goal_id, date)
);

-- Rewards catalog
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    reward_type VARCHAR(20) DEFAULT 'custom', -- custom, screen_time, activity
    reward_value INTEGER, -- extra minutes if screen_time reward
    is_active BOOLEAN DEFAULT true,
    times_redeemed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reward redemptions
CREATE TABLE IF NOT EXISTS reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_spent INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, denied, used
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by INTEGER REFERENCES users(id)
);

-- Points balance per child
CREATE TABLE IF NOT EXISTS points_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_earned INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    current_balance INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(child_id)
);

-- Points transaction history
CREATE TABLE IF NOT EXISTS points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL, -- earned, spent, adjusted
    amount INTEGER NOT NULL,
    description TEXT NOT NULL,
    reference_id UUID, -- goal_id or reward_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for goals and rewards
CREATE INDEX IF NOT EXISTS idx_goals_child_id ON goals(child_id);
CREATE INDEX IF NOT EXISTS idx_goals_active ON goals(is_active);
CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON goal_progress(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_date ON goal_progress(date);
CREATE INDEX IF NOT EXISTS idx_rewards_child_id ON rewards(child_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_child_id ON reward_redemptions(child_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_points_transactions_child_id ON points_transactions(child_id);

-- Seed Data (Development)
-- Removed test user
-- App Categories Table
CREATE TABLE IF NOT EXISTS app_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'folder',
    color VARCHAR(7) DEFAULT '#22c55e',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- App to Category Mappings (User-defined and Default)
CREATE TABLE IF NOT EXISTS app_category_mappings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    app_name VARCHAR(255) NOT NULL,
    category_id INTEGER NOT NULL REFERENCES app_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, app_name)
);

-- Category Limits per Child
CREATE TABLE IF NOT EXISTS category_limits (
    id SERIAL PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES app_categories(id) ON DELETE CASCADE,
    daily_limit_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(child_id, category_id)
);

-- Category Usage Tracking (Aggregated daily)
CREATE TABLE IF NOT EXISTS category_usage (
    id SERIAL PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES app_categories(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(child_id, category_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_category_mappings_user ON app_category_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_app_category_mappings_app ON app_category_mappings(app_name);
CREATE INDEX IF NOT EXISTS idx_category_limits_child ON category_limits(child_id);
CREATE INDEX IF NOT EXISTS idx_category_usage_child_date ON category_usage(child_id, date);
CREATE INDEX IF NOT EXISTS idx_category_usage_lookup ON category_usage(child_id, category_id, date);

-- Insert default categories
INSERT INTO app_categories (name, description, icon, color, is_default) VALUES
    ('Games', 'Video games and gaming apps', 'gamepad-2', '#ef4444', true),
    ('Social Media', 'Social networking apps', 'users', '#8b5cf6', true),
    ('Education', 'Learning and educational apps', 'graduation-cap', '#22c55e', true),
    ('Entertainment', 'Video streaming and entertainment', 'play-circle', '#f59e0b', true),
    ('Productivity', 'Work and productivity tools', 'briefcase', '#3b82f6', true),
    ('Communication', 'Messaging and communication', 'message-circle', '#06b6d4', true),
    ('Creativity', 'Art, music, and creative tools', 'palette', '#ec4899', true),
    ('Utilities', 'System and utility apps', 'settings', '#6b7280', true)
ON CONFLICT (name) DO NOTHING;

-- Default app mappings (common apps)
INSERT INTO app_categories (name, description, icon, color, is_default) 
SELECT 'Uncategorized', 'Apps not assigned to any category', 'help-circle', '#9ca3af', true
WHERE NOT EXISTS (SELECT 1 FROM app_categories WHERE name = 'Uncategorized');
-- ============================================
-- TIME REQUESTS SYSTEM
-- ============================================
-- Allows children to request extra screen time or app access
-- Parents can approve/deny requests via the app

-- Time Requests table
CREATE TABLE IF NOT EXISTS time_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('extra_time', 'app_access', 'schedule_override')),
    -- For extra_time: minutes requested
    -- For app_access: specific app name
    -- For schedule_override: reason/category
    requested_value INTEGER, -- minutes for extra_time
    requested_app VARCHAR(100), -- app name for app_access
    reason TEXT NOT NULL, -- child's explanation
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'cancelled')),
    parent_response TEXT, -- parent's response message
    approved_minutes INTEGER, -- actual minutes approved (may be less than requested)
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- when the approved time expires
    used_at TIMESTAMP WITH TIME ZONE, -- when the child actually used the approval
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_time_requests_child_id ON time_requests(child_id);
CREATE INDEX IF NOT EXISTS idx_time_requests_user_id ON time_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_time_requests_status ON time_requests(status);
CREATE INDEX IF NOT EXISTS idx_time_requests_pending ON time_requests(user_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_time_requests_created ON time_requests(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_time_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS time_requests_updated_at ON time_requests;
CREATE TRIGGER time_requests_updated_at
    BEFORE UPDATE ON time_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_time_requests_updated_at();

-- Seed some sample categories for request reasons (optional enhancement)
-- This could be expanded in the future to include predefined reasons
-- Web Filtering Feature Migration
-- Adds support for website blocking and content filtering

-- ============================================
-- Web Filter Rules Table
-- ============================================
CREATE TABLE IF NOT EXISTS web_filter_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('block', 'allow', 'category_block')),
    target VARCHAR(500) NOT NULL, -- domain, pattern, or category name
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('domain', 'pattern', 'category')),
    category VARCHAR(50), -- for category-based rules: adult, gambling, social, gaming, etc.
    is_active BOOLEAN DEFAULT true,
    applies_to_all BOOLEAN DEFAULT false, -- if true, applies to all children
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient web filter lookups
CREATE INDEX IF NOT EXISTS idx_web_filters_user_id ON web_filter_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_web_filters_child_id ON web_filter_rules(child_id);
CREATE INDEX IF NOT EXISTS idx_web_filters_active ON web_filter_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_web_filters_type ON web_filter_rules(rule_type, target_type);

-- ============================================
-- Web Browsing History Table
-- ============================================
CREATE TABLE IF NOT EXISTS web_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    domain VARCHAR(255) NOT NULL,
    page_title VARCHAR(500),
    category VARCHAR(50), -- auto-categorized
    duration_seconds INTEGER DEFAULT 0,
    was_blocked BOOLEAN DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for web history
CREATE INDEX IF NOT EXISTS idx_web_history_device ON web_history(device_id);
CREATE INDEX IF NOT EXISTS idx_web_history_child ON web_history(child_id);
CREATE INDEX IF NOT EXISTS idx_web_history_timestamp ON web_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_web_history_domain ON web_history(domain);
CREATE INDEX IF NOT EXISTS idx_web_history_blocked ON web_history(was_blocked) WHERE was_blocked = true;

-- ============================================
-- Default Blocked Categories Lookup Table
-- ============================================
CREATE TABLE IF NOT EXISTS web_category_defaults (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_adult_content BOOLEAN DEFAULT false,
    icon VARCHAR(50) DEFAULT 'globe',
    color VARCHAR(7) DEFAULT '#6b7280'
);

-- Insert default categories
INSERT INTO web_category_defaults (category, category_name, description, is_adult_content, icon, color) VALUES
    ('adult', 'Adult Content', 'Adult websites and mature content', true, 'alert-triangle', '#dc2626'),
    ('gambling', 'Gambling', 'Gambling, betting, and casino websites', true, 'dice', '#dc2626'),
    ('violence', 'Violence', 'Violent content and weapons', true, 'sword', '#dc2626'),
    ('drugs', 'Drugs & Alcohol', 'Drug-related and alcohol promotion content', true, 'pill', '#dc2626'),
    ('social', 'Social Media', 'Social networking platforms', false, 'users', '#8b5cf6'),
    ('gaming', 'Gaming', 'Online games and gaming platforms', false, 'gamepad', '#f59e0b'),
    ('entertainment', 'Entertainment', 'Streaming and entertainment sites', false, 'film', '#ec4899'),
    ('shopping', 'Shopping', 'E-commerce and shopping websites', false, 'shopping-cart', '#3b82f6'),
    ('news', 'News', 'News and media websites', false, 'newspaper', '#22c55e'),
    ('education', 'Education', 'Educational websites and resources', false, 'book', '#14b8a6')
ON CONFLICT (category) DO NOTHING;

-- ============================================
-- Web Filter Policies (Per-Child Settings)
-- ============================================
CREATE TABLE IF NOT EXISTS web_filter_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Global settings
    filter_enabled BOOLEAN DEFAULT true,
    block_adult_content BOOLEAN DEFAULT true,
    safe_search_enabled BOOLEAN DEFAULT true,
    
    -- Category blocks (JSON for flexibility)
    blocked_categories JSONB DEFAULT '["adult", "gambling", "violence", "drugs"]',
    
    -- Default action
    default_action VARCHAR(10) DEFAULT 'allow' CHECK (default_action IN ('allow', 'block')),
    
    -- Time-based filtering
    enforce_during_schedule_only BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(child_id)
);

CREATE INDEX IF NOT EXISTS idx_web_filter_policies_child ON web_filter_policies(child_id);
CREATE INDEX IF NOT EXISTS idx_web_filter_policies_enabled ON web_filter_policies(filter_enabled) WHERE filter_enabled = true;

-- Trigger to auto-create policy when child is created
CREATE OR REPLACE FUNCTION create_default_web_filter_policy()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO web_filter_policies (child_id, user_id)
    VALUES (NEW.id, NEW.user_id)
    ON CONFLICT (child_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_web_filter_policy ON children;
CREATE TRIGGER trigger_create_web_filter_policy
    AFTER INSERT ON children
    FOR EACH ROW
    EXECUTE FUNCTION create_default_web_filter_policy();

-- ============================================
-- Migration for existing children
-- ============================================
INSERT INTO web_filter_policies (child_id, user_id, filter_enabled, block_adult_content, safe_search_enabled, blocked_categories)
SELECT id, user_id, true, true, true, '["adult", "gambling", "violence", "drugs"]'
FROM children
ON CONFLICT (child_id) DO NOTHING;
-- Audit Logs Migration
-- Tracks all parent actions for accountability and troubleshooting

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'child', 'device', 'policy', 'schedule', etc.
  entity_id INTEGER,
  entity_name VARCHAR(255), -- Human-readable name
  old_values JSONB,
  new_values JSONB,
  metadata JSONB, -- Additional context
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite index for filtering by user and date range
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON audit_logs(user_id, created_at DESC);

COMMENT ON TABLE audit_logs IS 'Tracks all parent actions for accountability and troubleshooting';
-- ============================================
-- ANALYTICS & CUSTOMER TRACKING SYSTEM
-- ============================================
-- Privacy-focused analytics for understanding user behavior
-- Compliant with GDPR - no personal data, anonymized tracking

-- ============================================
-- Analytics Events Table
-- ============================================
-- Stores anonymized user actions and feature usage
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Anonymized session (hashed, no personal data)
    session_id VARCHAR(64) NOT NULL, -- SHA-256 hash of session
    
    -- Event details
    event_type VARCHAR(50) NOT NULL, -- page_view, feature_use, button_click, etc.
    event_name VARCHAR(100) NOT NULL, -- specific action name
    
    -- Context
    page_path VARCHAR(255), -- current page
    feature_category VARCHAR(50), -- dashboard, reports, settings, etc.
    
    -- Metadata (flexible JSON for different event types)
    metadata JSONB DEFAULT '{}',
    
    -- User context (anonymized)
    user_tier VARCHAR(20), -- free, premium (no user_id stored)
    device_type VARCHAR(20), -- desktop, mobile, tablet
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Partition key for efficient querying
    event_date DATE DEFAULT CURRENT_DATE
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type, event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_date ON analytics_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events(feature_category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);

-- ============================================
-- Aggregated Daily Stats Table
-- ============================================
-- Pre-computed daily metrics for fast dashboard queries
CREATE TABLE IF NOT EXISTS analytics_daily_stats (
    id SERIAL PRIMARY KEY,
    stat_date DATE NOT NULL UNIQUE,
    
    -- User engagement
    total_sessions INTEGER DEFAULT 0,
    unique_sessions INTEGER DEFAULT 0,
    avg_session_duration_seconds INTEGER DEFAULT 0,
    
    -- Page views
    total_page_views INTEGER DEFAULT 0,
    unique_page_views INTEGER DEFAULT 0,
    
    -- Feature usage counts (JSON for flexibility)
    feature_usage JSONB DEFAULT '{}',
    
    -- Top actions
    top_events JSONB DEFAULT '{}',
    
    -- Device breakdown
    device_breakdown JSONB DEFAULT '{}',
    
    -- User tier breakdown
    tier_breakdown JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_stats_date ON analytics_daily_stats(stat_date DESC);

-- ============================================
-- User Flow Tracking Table
-- ============================================
-- Tracks navigation paths to understand user journeys
CREATE TABLE IF NOT EXISTS analytics_user_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64) NOT NULL UNIQUE,
    
    -- Flow data
    entry_page VARCHAR(255) NOT NULL, -- where user started
    exit_page VARCHAR(255), -- where user left
    pages_visited INTEGER DEFAULT 0,
    page_sequence JSONB DEFAULT '[]', -- ordered list of pages visited
    
    -- Session metrics
    session_duration_seconds INTEGER,
    
    -- Outcome
    completed_goal BOOLEAN DEFAULT false, -- did they complete a key action?
    goal_type VARCHAR(50), -- what was the goal (add_child, export_report, etc.)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_date DATE DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_analytics_flows_session ON analytics_user_flows(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_flows_date ON analytics_user_flows(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_flows_entry ON analytics_user_flows(entry_page);

-- ============================================
-- Feature Flags Table (for A/B testing)
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_feature_flags (
    id SERIAL PRIMARY KEY,
    flag_name VARCHAR(100) UNIQUE NOT NULL,
    flag_description TEXT,
    enabled BOOLEAN DEFAULT false,
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
    target_tiers VARCHAR(20)[], -- which user tiers see this
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Analytics Configuration Table
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Default configuration
INSERT INTO analytics_config (config_key, config_value) VALUES
    ('tracking_enabled', '{"value": true}'),
    ('anonymize_ips', '{"value": true}'),
    ('track_feature_usage', '{"value": true}'),
    ('track_user_flows', '{"value": true}'),
    ('retention_days', '{"value": 90}'),
    ('plausible_enabled', '{"value": true}'),
    ('plausible_domain', '{"value": "app.screensprout.digitaladrenalin.net"}'),
    ('plausible_script_url', '{"value": "https://plausible.digitaladrenalin.net/js/script.js"}')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================
-- Helper Function: Track Analytics Event
-- ============================================
CREATE OR REPLACE FUNCTION track_analytics_event(
    p_session_id VARCHAR(64),
    p_event_type VARCHAR(50),
    p_event_name VARCHAR(100),
    p_page_path VARCHAR(255) DEFAULT NULL,
    p_feature_category VARCHAR(50) DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_user_tier VARCHAR(20) DEFAULT NULL,
    p_device_type VARCHAR(20) DEFAULT 'desktop'
) RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO analytics_events (
        session_id,
        event_type,
        event_name,
        page_path,
        feature_category,
        metadata,
        user_tier,
        device_type
    ) VALUES (
        p_session_id,
        p_event_type,
        p_event_name,
        p_page_path,
        p_feature_category,
        p_metadata,
        p_user_tier,
        p_device_type
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Helper Function: Update Daily Stats
-- ============================================
CREATE OR REPLACE FUNCTION update_daily_stats(p_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO analytics_daily_stats (
        stat_date,
        total_sessions,
        unique_sessions,
        total_page_views,
        unique_page_views,
        feature_usage,
        top_events,
        device_breakdown,
        tier_breakdown
    )
    SELECT 
        p_date,
        COUNT(*)::INTEGER as total_sessions,
        COUNT(DISTINCT session_id)::INTEGER as unique_sessions,
        COUNT(*) FILTER (WHERE event_type = 'page_view')::INTEGER as total_page_views,
        COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view')::INTEGER as unique_page_views,
        jsonb_object_agg(
            feature_category, 
            COUNT(*) FILTER (WHERE feature_category IS NOT NULL)
        ) FILTER (WHERE feature_category IS NOT NULL) as feature_usage,
        jsonb_object_agg(
            event_name, 
            COUNT(*)
        ) as top_events,
        jsonb_object_agg(
            device_type, 
            COUNT(*)
        ) as device_breakdown,
        jsonb_object_agg(
            user_tier, 
            COUNT(*) FILTER (WHERE user_tier IS NOT NULL)
        ) FILTER (WHERE user_tier IS NOT NULL) as tier_breakdown
    FROM analytics_events
    WHERE event_date = p_date
    GROUP BY event_date
    ON CONFLICT (stat_date) DO UPDATE SET
        total_sessions = EXCLUDED.total_sessions,
        unique_sessions = EXCLUDED.unique_sessions,
        total_page_views = EXCLUDED.total_page_views,
        unique_page_views = EXCLUDED.unique_page_views,
        feature_usage = EXCLUDED.feature_usage,
        top_events = EXCLUDED.top_events,
        device_breakdown = EXCLUDED.device_breakdown,
        tier_breakdown = EXCLUDED.tier_breakdown,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Helper Function: Cleanup Old Analytics Data
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_analytics_data()
RETURNS VOID AS $$
DECLARE
    v_retention_days INTEGER;
BEGIN
    -- Get retention setting
    SELECT (config_value->>'value')::INTEGER INTO v_retention_days
    FROM analytics_config
    WHERE config_key = 'retention_days';
    
    v_retention_days := COALESCE(v_retention_days, 90);
    
    -- Delete old events
    DELETE FROM analytics_events 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * v_retention_days;
    
    -- Delete old flow data
    DELETE FROM analytics_user_flows 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * v_retention_days;
    
    -- Note: Daily stats are kept indefinitely for trend analysis
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Views for Common Analytics Queries
-- ============================================

-- View: Daily Engagement Metrics
CREATE OR REPLACE VIEW analytics_engagement_daily AS
SELECT 
    stat_date,
    total_sessions,
    unique_sessions,
    total_page_views,
    unique_page_views,
    CASE 
        WHEN unique_sessions > 0 
        THEN ROUND(total_page_views::NUMERIC / unique_sessions, 2)
        ELSE 0 
    END as pages_per_session,
    avg_session_duration_seconds,
    updated_at
FROM analytics_daily_stats
ORDER BY stat_date DESC;

-- View: Top Features This Week
CREATE OR REPLACE VIEW analytics_top_features_week AS
SELECT 
    feature_category,
    COUNT(*) as usage_count,
    COUNT(DISTINCT session_id) as unique_users
FROM analytics_events
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    AND feature_category IS NOT NULL
GROUP BY feature_category
ORDER BY usage_count DESC;

-- View: Popular Actions This Week  
CREATE OR REPLACE VIEW analytics_popular_actions_week AS
SELECT 
    event_name,
    event_type,
    COUNT(*) as action_count,
    COUNT(DISTINCT session_id) as unique_users
FROM analytics_events
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY event_name, event_type
ORDER BY action_count DESC
LIMIT 20;

-- View: User Flow Drop-off Analysis
CREATE OR REPLACE VIEW analytics_flow_dropoff AS
SELECT 
    entry_page,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE completed_goal = true) as completed_sessions,
    COUNT(*) FILTER (WHERE exit_page = entry_page) as immediate_exits,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE completed_goal = true) / NULLIF(COUNT(*), 0),
        2
    ) as completion_rate,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE exit_page = entry_page) / NULLIF(COUNT(*), 0),
        2
    ) as bounce_rate
FROM analytics_user_flows
WHERE session_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY entry_page
ORDER BY total_sessions DESC;

COMMENT ON TABLE analytics_events IS 'Stores anonymized user interaction events for product analytics';
COMMENT ON TABLE analytics_daily_stats IS 'Pre-computed daily analytics aggregates for fast querying';
COMMENT ON TABLE analytics_user_flows IS 'Tracks user navigation paths and session outcomes';

-- ============================================
-- Device Pairing & Tokens (Option A)
-- ============================================

-- Pairing codes (short-lived, generated by parent)
CREATE TABLE IF NOT EXISTS pairing_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(6) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    device_name VARCHAR(100) DEFAULT 'New Device',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    used_by_device_id UUID REFERENCES devices(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pairing_codes_code ON pairing_codes(code) WHERE used = false;
CREATE INDEX IF NOT EXISTS idx_pairing_codes_user ON pairing_codes(user_id);

-- Device tokens (long-lived, issued on pairing)
CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL,
    revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_hash ON device_tokens(token_hash) WHERE revoked = false;
CREATE INDEX IF NOT EXISTS idx_device_tokens_device ON device_tokens(device_id);

-- Geofences
CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters DECIMAL(10, 2) NOT NULL,
    geofence_type VARCHAR(20) DEFAULT 'safe' CHECK (geofence_type IN ('safe', 'restricted')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_geofences_child ON geofences(child_id);
CREATE INDEX IF NOT EXISTS idx_geofences_user ON geofences(user_id);

-- Geofence Events
CREATE TABLE IF NOT EXISTS geofence_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('enter', 'exit')),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_geofence_events_child ON geofence_events(child_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_geofence ON geofence_events(geofence_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_timestamp ON geofence_events(timestamp DESC);

-- Location History
CREATE TABLE IF NOT EXISTS location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    speed DECIMAL(10, 2),
    bearing DECIMAL(10, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_location_history_child ON location_history(child_id);
CREATE INDEX IF NOT EXISTS idx_location_history_timestamp ON location_history(timestamp DESC);

-- Current Locations (latest location per child)
CREATE TABLE IF NOT EXISTS current_locations (
    child_id UUID PRIMARY KEY REFERENCES children(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Screen Time Summary (aggregated daily usage per child)
CREATE TABLE IF NOT EXISTS screen_time_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_minutes INTEGER DEFAULT 0,
    category_minutes JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(child_id, date)
);

CREATE INDEX IF NOT EXISTS idx_screen_time_summary_child ON screen_time_summary(child_id);
CREATE INDEX IF NOT EXISTS idx_screen_time_summary_date ON screen_time_summary(date);

