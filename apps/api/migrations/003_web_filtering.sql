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
