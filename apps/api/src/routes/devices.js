/**
 * Devices Routes
 */

const express = require('express');
const { authenticateToken, verifyDeviceOwnership, verifyChildOwnership } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

const router = express.Router();

// List Devices
router.get('/', authenticateToken, async (req, res) => {
    const pool = req.app.get('db');
    try {
        // 1. Get devices with child info
        const devicesResult = await pool.query(
            `SELECT d.id, d.device_name, d.device_type, d.last_seen, d.policy_json, d.child_id, c.name as child_name
       FROM devices d
       LEFT JOIN children c ON d.child_id = c.id
       WHERE d.user_id = $1 
       ORDER BY d.last_seen DESC`,
            [req.user.id]
        );

        const devices = devicesResult.rows;
        if (devices.length === 0) return res.json([]);

        // 2. Get usage stats
        const deviceIds = devices.map(d => d.id);

        // Fetch aggregation for user
        const usageResult = await pool.query(
            `SELECT device_id, SUM(duration_seconds) as used_seconds
       FROM activity_logs
       WHERE device_id = ANY($1) AND timestamp >= CURRENT_DATE::timestamptz
       GROUP BY device_id`,
            [deviceIds]
        );

        const usageMap = new Map();
        usageResult.rows.forEach(row => {
            usageMap.set(row.device_id, parseInt(row.used_seconds || 0));
        });

        // Combine
        const result = devices.map(d => ({
            ...d,
            used_seconds: usageMap.get(d.id) || 0
        }));

        res.json(result);
    } catch (err) {
        console.error('[Devices] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Enroll a device
router.post('/enroll', authenticateToken, csrfProtection, async (req, res) => {
    const { deviceId, deviceName, deviceType } = req.body;
    const pool = req.app.get('db');

    if (!deviceId || !deviceName || !deviceType) {
        return res.status(400).json({ error: 'deviceId, deviceName, and deviceType are required' });
    }

    try {
        // Check if device already exists
        const existing = await pool.query('SELECT user_id FROM devices WHERE id = $1', [deviceId]);

        if (existing.rows.length > 0 && existing.rows[0].user_id !== req.user.id) {
            // Device belongs to another user — do not allow hijacking
            return res.status(403).json({ error: 'Device is already registered to another account' });
        }

        // Safe upsert: only update if same owner or insert if new
        await pool.query(
            `INSERT INTO devices (id, user_id, device_name, device_type, last_seen)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (id) DO UPDATE SET 
                device_name = EXCLUDED.device_name,
                device_type = EXCLUDED.device_type,
                last_seen = NOW()
             WHERE devices.user_id = EXCLUDED.user_id`,
            [deviceId, req.user.id, deviceName, deviceType]
        );

        // Return default or existing policy logic here...
        res.json({ status: 'enrolled', policy: { dailyLimitMinutes: 120 } });
    } catch (err) {
        console.error('[Devices] Error enrolling device:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update Device Info (Name, etc)
router.put('/:deviceId', authenticateToken, csrfProtection, async (req, res) => {
    const { deviceId } = req.params;
    const { deviceName } = req.body;
    const pool = req.app.get('db');

    try {
        // Verify ownership
        const isOwner = await verifyDeviceOwnership(deviceId, req.user.id, pool);
        if (!isOwner) return res.status(404).json({ error: 'Device not found' });

        const result = await pool.query(
            'UPDATE devices SET device_name = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
            [deviceName, deviceId, req.user.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[Devices] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Assign device to child
router.put('/:deviceId/assign', authenticateToken, csrfProtection, async (req, res) => {
    const { deviceId } = req.params;
    const { childId } = req.body; // childId can be null to unassign
    const pool = req.app.get('db');

    try {
        // Verify ownership of device
        const isOwner = await verifyDeviceOwnership(deviceId, req.user.id, pool);
        if (!isOwner) return res.status(404).json({ error: 'Device not found' });

        // Verify ownership of child if provided
        if (childId) {
            const isChildOwner = await verifyChildOwnership(childId, req.user.id, pool);
            if (!isChildOwner) return res.status(404).json({ error: 'Child profile not found' });
        }

        // Update
        const result = await pool.query(
            'UPDATE devices SET child_id = $1 WHERE id = $2 RETURNING *',
            [childId, deviceId]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('[Devices] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Policy
router.get('/policy/:deviceId', authenticateToken, async (req, res) => {
    const { deviceId } = req.params;
    const pool = req.app.get('db');

    try {
        // Verify ownership
        const isOwner = await verifyDeviceOwnership(deviceId, req.user.id, pool);
        if (!isOwner) return res.status(404).json({ error: 'Device not found or access denied' });

        const result = await pool.query('SELECT * FROM devices WHERE id = $1 AND user_id = $2', [deviceId, req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Device not found or access denied' });

        res.json(result.rows[0].policy_json || {});
    } catch (err) {
        console.error('[Devices] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update Policy
router.put('/policy/:deviceId', authenticateToken, csrfProtection, async (req, res) => {
    const { deviceId } = req.params;
    const newPolicy = req.body;
    const pool = req.app.get('db');

    try {
        // Verify ownership
        const isOwner = await verifyDeviceOwnership(deviceId, req.user.id, pool);
        if (!isOwner) return res.status(404).json({ error: 'Device not found or access denied' });

        const result = await pool.query(
            'UPDATE devices SET policy_json = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
            [newPolicy, deviceId, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Device not found or access denied' });

        res.json({ status: 'updated', policy: result.rows[0].policy_json });
    } catch (err) {
        console.error('[Devices] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Stats
router.get('/stats/:deviceId', authenticateToken, async (req, res) => {
    const { deviceId } = req.params;
    const pool = req.app.get('db');

    try {
        // Ensure ownership
        const isOwner = await verifyDeviceOwnership(deviceId, req.user.id, pool);
        if (!isOwner) return res.status(404).json({ error: 'Device not found or access denied' });

        // Aggregate last 24h
        const stats = await pool.query(
            `SELECT app_name, SUM(duration_seconds) as total_seconds
             FROM activity_logs
             WHERE device_id = $1 AND timestamp > NOW() - INTERVAL '24 hours'
             GROUP BY app_name
             ORDER BY total_seconds DESC`,
            [deviceId]
        );
        res.json(stats.rows);
    } catch (err) {
        console.error('[Devices] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// Live Status (for LiveMonitor dashboard)
// ============================================

/**
 * GET /live-status
 * Returns all devices for the authenticated user with real-time status info.
 */
router.get('/live-status', authenticateToken, async (req, res) => {
    const pool = req.app.get('db');

    try {
        // Get devices with child info
        const devicesResult = await pool.query(
            `SELECT d.id, d.device_name, d.device_type, d.last_seen, d.child_id,
                    c.name as child_name, c.daily_limit_minutes
             FROM devices d
             LEFT JOIN children c ON d.child_id = c.id
             WHERE d.user_id = $1
             ORDER BY d.last_seen DESC NULLS LAST`,
            [req.user.id]
        );

        if (devicesResult.rows.length === 0) {
            return res.json([]);
        }

        const deviceIds = devicesResult.rows.map(d => d.id);

        // Get device status (online, battery, current app, paused)
        const statusResult = await pool.query(
            `SELECT device_id, is_online, current_app, battery_level, battery_charging,
                    paused_until, last_heartbeat_at, connection_quality
             FROM device_status
             WHERE device_id = ANY($1)`,
            [deviceIds]
        );

        const statusMap = new Map();
        statusResult.rows.forEach(row => statusMap.set(row.device_id, row));

        // Get today's usage per device
        const usageResult = await pool.query(
            `SELECT device_id, COALESCE(SUM(duration_seconds), 0) as used_seconds
             FROM activity_logs
             WHERE device_id = ANY($1) AND timestamp >= CURRENT_DATE::timestamptz
             GROUP BY device_id`,
            [deviceIds]
        );

        const usageMap = new Map();
        usageResult.rows.forEach(row => usageMap.set(row.device_id, parseInt(row.used_seconds || 0)));

        // Get last app used per device
        const lastAppResult = await pool.query(
            `SELECT DISTINCT ON (device_id) device_id, app_name as last_app_used
             FROM activity_logs
             WHERE device_id = ANY($1)
             ORDER BY device_id, timestamp DESC`,
            [deviceIds]
        );

        const lastAppMap = new Map();
        lastAppResult.rows.forEach(row => lastAppMap.set(row.device_id, row.last_app_used));

        // Classify status: online (heartbeat < 2 min), stale (< 10 min), offline
        const STALE_THRESHOLD_MS = 10 * 60 * 1000;
        const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;
        const now = Date.now();

        const result = devicesResult.rows.map(d => {
            const status = statusMap.get(d.id);
            const isOnline = status?.is_online || false;
            const lastHeartbeat = status?.last_heartbeat_at ? new Date(status.last_heartbeat_at).getTime() : 0;
            const lastSeen = d.last_seen ? new Date(d.last_seen).getTime() : 0;
            const lastActivity = Math.max(lastHeartbeat, lastSeen);

            let deviceStatus = 'offline';
            if (isOnline && (now - lastActivity) < ONLINE_THRESHOLD_MS) {
                deviceStatus = 'online';
            } else if (lastActivity > 0 && (now - lastActivity) < STALE_THRESHOLD_MS) {
                deviceStatus = 'stale';
            }

            const isPaused = status?.paused_until ? new Date(status.paused_until) > new Date() : false;

            return {
                id: d.id,
                device_name: d.device_name,
                device_type: d.device_type,
                child_id: d.child_id,
                child_name: d.child_name,
                daily_limit_minutes: d.daily_limit_minutes || 120,
                status: deviceStatus,
                isPaused,
                battery_level: status?.battery_level,
                battery_charging: status?.battery_charging || false,
                current_app: status?.current_app,
                last_app_used: lastAppMap.get(d.id),
                last_heartbeat_at: status?.last_heartbeat_at,
                last_seen: d.last_seen,
                used_seconds_today: usageMap.get(d.id) || 0
            };
        });

        res.json(result);
    } catch (err) {
        console.error('[Devices] Live-status error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// Pairing Code Generation (parent-side)
// ============================================

/**
 * POST /pair/generate
 * Parent generates a 6-digit pairing code for a specific child.
 * Code is valid for 10 minutes.
 */
router.post('/pair/generate', authenticateToken, csrfProtection, async (req, res) => {
    const { childId, deviceName } = req.body;
    const pool = req.app.get('db');

    if (!childId) {
        return res.status(400).json({ error: 'childId is required' });
    }

    try {
        // Verify parent owns this child
        const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
        if (!isOwner) {
            return res.status(404).json({ error: 'Child not found' });
        }

        // Generate a 6-digit code
        const crypto = require('crypto');
        const code = crypto.randomInt(100000, 999999).toString();

        // Expire any existing unused codes for this child
        await pool.query(
            'UPDATE pairing_codes SET used = true WHERE child_id = $1 AND used = false',
            [childId]
        );

        // Create new code (valid for 10 minutes)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await pool.query(
            `INSERT INTO pairing_codes (code, user_id, child_id, device_name, expires_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [code, req.user.id, childId, deviceName || 'New Device', expiresAt]
        );

        res.json({
            code,
            expiresAt: expiresAt.toISOString(),
            childId
        });

    } catch (err) {
        console.error('[Devices] Pairing code generation error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /pair/revoke/:deviceId
 * Parent revokes all active device tokens for a device.
 */
router.delete('/pair/revoke/:deviceId', authenticateToken, csrfProtection, async (req, res) => {
    const { deviceId } = req.params;
    const pool = req.app.get('db');

    try {
        // Verify parent owns this device
        const isOwner = await verifyDeviceOwnership(deviceId, req.user.id, pool);
        if (!isOwner) {
            return res.status(404).json({ error: 'Device not found' });
        }

        // Revoke all active tokens
        const result = await pool.query(
            'UPDATE device_tokens SET revoked = true, revoked_at = NOW() WHERE device_id = $1 AND revoked = false',
            [deviceId]
        );

        res.json({
            success: true,
            tokensRevoked: result.rowCount
        });

    } catch (err) {
        console.error('[Devices] Token revocation error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// Pause / Resume / Message (parent -> device)
// ============================================

/**
 * POST /:deviceId/pause
 * Pause a device for a specified duration.
 */
router.post('/:deviceId/pause', authenticateToken, csrfProtection, async (req, res) => {
    const { deviceId } = req.params;
    const { durationMinutes, message } = req.body;
    const pool = req.app.get('db');

    try {
        const isOwner = await verifyDeviceOwnership(deviceId, req.user.id, pool);
        if (!isOwner) return res.status(404).json({ error: 'Device not found' });

        const minutes = parseInt(durationMinutes) || 30;
        const pausedUntil = new Date(Date.now() + minutes * 60 * 1000);

        await pool.query(
            `INSERT INTO device_status (device_id, is_online, paused_until, updated_at)
             VALUES ($1, true, $2, NOW())
             ON CONFLICT (device_id) DO UPDATE SET paused_until = $2, updated_at = NOW()`,
            [deviceId, pausedUntil]
        );

        // Store the pause message if provided
        if (message) {
            await pool.query(
                `INSERT INTO device_messages (device_id, message) VALUES ($1, $2)`,
                [deviceId, message]
            );
        }

        res.json({ success: true, pausedUntil: pausedUntil.toISOString() });
    } catch (err) {
        console.error('[Devices] Pause error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /:deviceId/resume
 * Resume a paused device.
 */
router.post('/:deviceId/resume', authenticateToken, csrfProtection, async (req, res) => {
    const { deviceId } = req.params;
    const pool = req.app.get('db');

    try {
        const isOwner = await verifyDeviceOwnership(deviceId, req.user.id, pool);
        if (!isOwner) return res.status(404).json({ error: 'Device not found' });

        await pool.query(
            `UPDATE device_status SET paused_until = NULL, updated_at = NOW() WHERE device_id = $1`,
            [deviceId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('[Devices] Resume error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /:deviceId/message
 * Send a message notification to a device.
 */
router.post('/:deviceId/message', authenticateToken, csrfProtection, async (req, res) => {
    const { deviceId } = req.params;
    const { message } = req.body;
    const pool = req.app.get('db');

    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const isOwner = await verifyDeviceOwnership(deviceId, req.user.id, pool);
        if (!isOwner) return res.status(404).json({ error: 'Device not found' });

        await pool.query(
            `INSERT INTO device_messages (device_id, message) VALUES ($1, $2)`,
            [deviceId, message]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('[Devices] Message error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
