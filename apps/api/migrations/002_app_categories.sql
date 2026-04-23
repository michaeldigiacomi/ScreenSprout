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
