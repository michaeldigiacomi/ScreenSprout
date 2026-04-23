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
