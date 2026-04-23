-- Webhook Configuration Table
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    secret VARCHAR(255) NOT NULL, -- For HMAC signature verification
    events JSONB NOT NULL DEFAULT '["time_limit_reached", "device_offline", "blocked_app_attempt"]',
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;

-- Webhook Delivery Logs table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    delivery_duration_ms INTEGER,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for delivery logs
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event ON webhook_deliveries(event_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for webhooks table
DROP TRIGGER IF EXISTS update_webhooks_updated_at ON webhooks;
CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
