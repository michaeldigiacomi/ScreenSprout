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
