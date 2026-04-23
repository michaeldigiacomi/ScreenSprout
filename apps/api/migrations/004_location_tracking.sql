-- ============================================
-- LOCATION TRACKING & GEOFENCING SYSTEM
-- ============================================
-- Tracks device locations and manages geofenced safe zones

-- Location History Table
CREATE TABLE IF NOT EXISTS location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2), -- GPS accuracy in meters
    altitude DECIMAL(10, 2),
    speed DECIMAL(8, 2), -- speed in m/s
    battery_level INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient location queries
CREATE INDEX IF NOT EXISTS idx_location_history_device ON location_history(device_id);
CREATE INDEX IF NOT EXISTS idx_location_history_child ON location_history(child_id);
CREATE INDEX IF NOT EXISTS idx_location_history_timestamp ON location_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_location_history_recent ON location_history(device_id, timestamp DESC);

-- Geofences Table (Safe Zones)
CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100, -- radius in meters
    geofence_type VARCHAR(20) DEFAULT 'safe' CHECK (geofence_type IN ('safe', 'unsafe', 'notification')),
    is_active BOOLEAN DEFAULT true,
    notify_on_enter BOOLEAN DEFAULT true,
    notify_on_exit BOOLEAN DEFAULT true,
    icon VARCHAR(50) DEFAULT 'map-pin',
    color VARCHAR(7) DEFAULT '#22c55e',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for geofences
CREATE INDEX IF NOT EXISTS idx_geofences_child_id ON geofences(child_id);
CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(is_active) WHERE is_active = true;

-- Geofence Events Table (Entry/Exit tracking)
CREATE TABLE IF NOT EXISTS geofence_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    event_type VARCHAR(10) NOT NULL CHECK (event_type IN ('enter', 'exit')),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for geofence events
CREATE INDEX IF NOT EXISTS idx_geofence_events_geofence ON geofence_events(geofence_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_child ON geofence_events(child_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_timestamp ON geofence_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_geofence_events_recent ON geofence_events(child_id, timestamp DESC);

-- Current Location Cache (always shows latest location per device)
CREATE TABLE IF NOT EXISTS current_locations (
    device_id UUID PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    altitude DECIMAL(10, 2),
    speed DECIMAL(8, 2),
    battery_level INTEGER,
    is_online BOOLEAN DEFAULT true,
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for current location lookups
CREATE INDEX IF NOT EXISTS idx_current_locations_child ON current_locations(child_id);

-- Trigger to update geofence updated_at
CREATE OR REPLACE FUNCTION update_geofences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS geofences_updated_at ON geofences;
CREATE TRIGGER geofences_updated_at
    BEFORE UPDATE ON geofences
    FOR EACH ROW
    EXECUTE FUNCTION update_geofences_updated_at();

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL(10, 8),
    lon1 DECIMAL(11, 8),
    lat2 DECIMAL(10, 8),
    lon2 DECIMAL(11, 8)
)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
    R INTEGER := 6371000; -- Earth's radius in meters
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dlat := RADIANS(lat2 - lat1);
    dlon := RADIANS(lon2 - lon1);
    a := SIN(dlat/2) * SIN(dlat/2) +
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
         SIN(dlon/2) * SIN(dlon/2);
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- Insert sample geofence types/defaults
COMMENT ON TABLE geofences IS 'Stores safe/unsafe zone definitions for geofencing';
COMMENT ON TABLE location_history IS 'Stores historical location data for devices';
COMMENT ON TABLE geofence_events IS 'Tracks entry and exit events for geofences';
COMMENT ON TABLE current_locations IS 'Cache of most recent location per device';
