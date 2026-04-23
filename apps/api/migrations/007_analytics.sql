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
