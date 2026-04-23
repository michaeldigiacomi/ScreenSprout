-- Dark Mode Theme Support Migration
-- Adds theme preference column to users table

-- Add theme preference column
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system'));

-- Create index for theme lookups (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_users_theme ON users(theme);

-- Update existing users to use system default
UPDATE users SET theme = 'system' WHERE theme IS NULL;
