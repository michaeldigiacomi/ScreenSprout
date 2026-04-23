-- Migration 009: Add missing tables for geofences, locations, and screen time summary
-- These tables are referenced by route handlers but were missing from the initial schema.

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

-- Current Locations
CREATE TABLE IF NOT EXISTS current_locations (
    child_id UUID PRIMARY KEY REFERENCES children(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Screen Time Summary
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