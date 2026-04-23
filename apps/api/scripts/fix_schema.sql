
BEGIN;

-- 1. Fix analytics_user_flows constraint
-- Add unique index which supports the ON CONFLICT clause
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_user_flows_session_id 
ON analytics_user_flows (session_id);

-- Optionally add the constraint explicitly for completeness
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analytics_user_flows_session_id_key') THEN
        ALTER TABLE analytics_user_flows 
        ADD CONSTRAINT analytics_user_flows_session_id_key UNIQUE USING INDEX idx_analytics_user_flows_session_id;
    END IF;
EXCEPTION
    WHEN duplicate_table THEN NULL;
END $$;

-- 2. Create pairing_codes table
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

-- 3. Create device_tokens table
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

COMMIT;
