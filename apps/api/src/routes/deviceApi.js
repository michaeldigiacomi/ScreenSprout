/**
 * Device API Routes
 * 
 * Endpoints for device clients (desktop/mobile). Uses device token auth
 * instead of user JWT. The flow is:
 * 1. Parent generates a pairing code on the web dashboard
 * 2. Device enters the code via POST /pair
 * 3. Backend validates, registers device, issues a device JWT
 * 4. Device uses the JWT for all subsequent requests
 */

const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

const router = express.Router();

// ============================================
// Device Token Auth Middleware
// ============================================

/**
 * Authenticate device requests via "Authorization: Device <token>" header.
 * Attaches req.device = { id, userId, childId, deviceName } on success.
 */
async function authenticateDevice(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Device ')) {
        return res.status(401).json({ error: 'Device authentication required' });
    }

    const token = authHeader.substring(7); // Strip "Device "

    try {
        // Verify the JWT
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.type !== 'device') {
            return res.status(403).json({ error: 'Invalid token type' });
        }

        // Check token is not revoked
        const pool = req.app.get('db');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const tokenCheck = await pool.query(
            'SELECT 1 FROM device_tokens WHERE token_hash = $1 AND revoked = false',
            [tokenHash]
        );

        if (tokenCheck.rows.length === 0) {
            return res.status(401).json({ error: 'Device token revoked or invalid' });
        }

        // Update last_used_at
        await pool.query(
            'UPDATE device_tokens SET last_used_at = NOW() WHERE token_hash = $1',
            [tokenHash]
        );

        req.device = {
            id: decoded.deviceId,
            userId: decoded.userId,
            childId: decoded.childId,
            deviceName: decoded.deviceName
        };

        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Invalid or expired device token' });
        }
        console.error('[DeviceAPI] Auth error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// ============================================
// Pairing Endpoint (unauthenticated by JWT)
// ============================================

/**
 * POST /pair
 * Device sends a 6-digit pairing code + device info.
 * Returns a device JWT on success.
 */
router.post('/pair', async (req, res) => {
    const { code, deviceId, deviceName, deviceType } = req.body;
    const pool = req.app.get('db');

    // Validate inputs
    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Pairing code is required' });
    }
    if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
    }

    // Normalize device type to lowercase (clients may send 'iOS', 'macOS', etc.)
    const normalizedDeviceType = (deviceType || 'windows').toLowerCase();

    try {
        // Look up the pairing code
        const codeResult = await pool.query(
            `SELECT id, user_id, child_id, device_name, expires_at 
             FROM pairing_codes 
             WHERE code = $1 AND used = false AND expires_at > NOW()`,
            [code.trim()]
        );

        if (codeResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired pairing code' });
        }

        const pairing = codeResult.rows[0];

        // Register/update device
        await pool.query(
            `INSERT INTO devices (id, user_id, child_id, device_name, device_type, last_seen)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (id) DO UPDATE SET 
                user_id = EXCLUDED.user_id,
                child_id = EXCLUDED.child_id,
                device_name = EXCLUDED.device_name,
                device_type = EXCLUDED.device_type,
                last_seen = NOW()`,
            [deviceId, pairing.user_id, pairing.child_id,
                deviceName || pairing.device_name || 'Desktop',
                normalizedDeviceType]
        );

        // Initialize device_status
        await pool.query(
            `INSERT INTO device_status (device_id, is_online, last_heartbeat_at)
             VALUES ($1, true, NOW())
             ON CONFLICT (device_id) DO UPDATE SET 
                is_online = true, last_heartbeat_at = NOW()`,
            [deviceId]
        );

        // Generate device JWT (no expiry — revocable via device_tokens table)
        const deviceToken = jwt.sign(
            {
                type: 'device',
                deviceId: deviceId,
                userId: pairing.user_id,
                childId: pairing.child_id,
                deviceName: deviceName || pairing.device_name
            },
            JWT_SECRET
        );

        // Store token hash for revocation support
        const tokenHash = crypto.createHash('sha256').update(deviceToken).digest('hex');
        await pool.query(
            `INSERT INTO device_tokens (device_id, token_hash) VALUES ($1, $2)`,
            [deviceId, tokenHash]
        );

        // Mark pairing code as used
        await pool.query(
            'UPDATE pairing_codes SET used = true, used_by_device_id = $1 WHERE id = $2',
            [deviceId, pairing.id]
        );

        // Fetch child name for the response
        const childResult = await pool.query(
            'SELECT name FROM children WHERE id = $1',
            [pairing.child_id]
        );

        res.json({
            status: 'paired',
            token: deviceToken,
            device: {
                id: deviceId,
                name: deviceName || pairing.device_name,
                childId: pairing.child_id,
                childName: childResult.rows[0]?.name || 'Child'
            }
        });

    } catch (err) {
        console.error('[DeviceAPI] Pairing error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// Heartbeat (device-authenticated)
// ============================================

/**
 * POST /heartbeat
 * Device reports activity data. Returns computed policy.
 * Accepts HeartbeatPayload: { activity, batteryLevel, isOnline,
 *   appsConfigured, isShieldActive, isPaused, familyActivitySelectionData }
 */
router.post('/heartbeat', authenticateDevice, async (req, res) => {
    const { activity, batteryLevel, isOnline, appsConfigured, isShieldActive, isPaused, familyActivitySelectionData } = req.body;
    const pool = req.app.get('db');
    const deviceId = req.device.id;
    const childId = req.device.childId;
    const userId = req.device.userId;

    try {
        // Update device last_seen
        await pool.query('UPDATE devices SET last_seen = NOW() WHERE id = $1', [deviceId]);

        // Store FamilyActivitySelection data if provided
        if (familyActivitySelectionData) {
            await pool.query(
                'UPDATE devices SET family_selection_data = $1 WHERE id = $2',
                [familyActivitySelectionData, deviceId]
            );
        }

        // Update device_status with battery, shield state, etc.
        await pool.query(
            `UPDATE device_status SET
                is_online = true,
                last_heartbeat_at = NOW(),
                battery_level = $2,
                updated_at = NOW()
             WHERE device_id = $1`,
            [deviceId, batteryLevel != null ? Math.round(batteryLevel * 100) : null]
        );

        // Process activity events
        if (Array.isArray(activity) && activity.length > 0) {
            for (const item of activity) {
                // Legacy per-app activity logs (from desktop/Android clients)
                if (item.appName && item.durationSeconds > 0) {
                    await pool.query(
                        `INSERT INTO activity_logs (device_id, app_name, duration_seconds, timestamp)
                         VALUES ($1, $2, $3, $4)`,
                        [deviceId, item.appName, item.durationSeconds, item.timestamp || new Date()]
                    );
                }

                // Threshold events from iOS DeviceActivityMonitor extension
                if (item.type === 'threshold' && item.label) {
                    // Create a notification for the parent
                    let title, message;
                    if (item.label === 'DailyLimit') {
                        title = 'Daily Limit Reached';
                        message = `${req.device.deviceName || 'Device'} has reached the daily screen time limit.`;
                    } else if (item.label === 'Warning75') {
                        title = '75% of Daily Limit Used';
                        message = `${req.device.deviceName || 'Device'} has used 75% of the daily screen time limit.`;
                    } else if (item.label === 'Warning50') {
                        title = '50% of Daily Limit Used';
                        message = `${req.device.deviceName || 'Device'} has used 50% of the daily screen time limit.`;
                    } else {
                        title = 'Screen Time Alert';
                        message = `Threshold event: ${item.label} on ${req.device.deviceName || 'device'}.`;
                    }

                    try {
                        await pool.query(
                            `INSERT INTO notifications (user_id, child_id, type, title, message, data)
                             VALUES ($1, $2, 'time_limit', $3, $4, $5)`,
                            [userId, childId, title, message, JSON.stringify({ deviceId, event: item.label, timestamp: item.timestamp })]
                        );
                    } catch (notifErr) {
                        console.error('[DeviceAPI] Failed to create threshold notification:', notifErr.message);
                    }
                }

                // Time request events from ShieldAction extension
                if (item.type === 'time_request' && item.label) {
                    try {
                        await pool.query(
                            `INSERT INTO notifications (user_id, child_id, type, title, message, data)
                             VALUES ($1, $2, 'time_request', $3, $4, $5)`,
                            [userId, childId, 'More Time Requested',
                             `${req.device.deviceName || 'Device'} requested more screen time.`,
                             JSON.stringify({ deviceId, requestType: item.label, timestamp: item.timestamp })]
                        );
                    } catch (notifErr) {
                        console.error('[DeviceAPI] Failed to create time request notification:', notifErr.message);
                    }
                }
            }
        }

        // Return computed policy
        const policy = await computePolicy(pool, deviceId, childId);

        // Include the familyActivitySelectionData in the policy response
        // so the child device can apply the stored selection
        if (familyActivitySelectionData) {
            policy.familyActivitySelectionData = familyActivitySelectionData;
        } else {
            // Echo back the stored selection if we have one
            const selectionResult = await pool.query(
                'SELECT family_selection_data FROM devices WHERE id = $1',
                [deviceId]
            );
            if (selectionResult.rows[0]?.family_selection_data) {
                policy.familyActivitySelectionData = selectionResult.rows[0].family_selection_data;
            }
        }

        res.json(policy);

    } catch (err) {
        console.error('[DeviceAPI] Heartbeat error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// Policy (device-authenticated)
// ============================================

/**
 * GET /policy
 * Returns the full computed policy for this device/child.
 */
router.get('/policy', authenticateDevice, async (req, res) => {
    const pool = req.app.get('db');

    try {
        const policy = await computePolicy(pool, req.device.id, req.device.childId);
        res.json(policy);
    } catch (err) {
        console.error('[DeviceAPI] Policy error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// Computed Policy Helper
// ============================================

/**
 * Computes the full policy response that the desktop client expects.
 * Includes: blocked/allowed apps, remaining time, bonus time, active schedule.
 */
async function computePolicy(pool, deviceId, childId) {
    // 1. Get child info and daily limit
    const childResult = await pool.query(
        'SELECT id, name, daily_limit_minutes, blocked_apps, always_allowed_apps FROM children WHERE id = $1',
        [childId]
    );

    if (childResult.rows.length === 0) {
        return { error: 'Child not found', remainingMinutes: 0 };
    }

    const child = childResult.rows[0];
    const dailyLimitMinutes = child.daily_limit_minutes || 120;

    // 2. Get today's usage
    const usageResult = await pool.query(
        `SELECT COALESCE(SUM(duration_seconds), 0) as total_seconds
         FROM activity_logs 
         WHERE device_id = $1 AND timestamp >= CURRENT_DATE::timestamptz`,
        [deviceId]
    );
    const usedSeconds = parseInt(usageResult.rows[0].total_seconds);
    const usedMinutes = Math.floor(usedSeconds / 60);

    // 3. Get available bonus time
    const bonusResult = await pool.query(
        `SELECT COALESCE(SUM(minutes), 0) as total_bonus
         FROM bonus_time_grants 
         WHERE child_id = $1 AND is_used = false 
           AND (expires_at IS NULL OR expires_at > NOW())`,
        [childId]
    );
    const bonusMinutes = parseInt(bonusResult.rows[0].total_bonus);

    // 4. Calculate remaining time
    const totalAllowedMinutes = dailyLimitMinutes + bonusMinutes;
    const remainingMinutes = Math.max(0, totalAllowedMinutes - usedMinutes);

    // 5. Get current active schedule
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0-6 (Sun-Sat)
    const currentTime = now.toTimeString().substring(0, 8); // HH:MM:SS

    const scheduleResult = await pool.query(
        `SELECT id, name, blocked_apps, always_allowed_apps
         FROM schedules 
         WHERE child_id = $1 AND is_active = true 
           AND $2 = ANY(days_of_week)
           AND start_time <= $3::time AND end_time > $3::time`,
        [childId, dayOfWeek, currentTime]
    );

    let activeSchedule = null;
    if (scheduleResult.rows.length > 0) {
        const sched = scheduleResult.rows[0];
        activeSchedule = {
            name: sched.name,
            blockedApps: sched.blocked_apps || [],
            alwaysAllowedApps: sched.always_allowed_apps || []
        };
    }

    // 6. Get device info
    const deviceResult = await pool.query(
        'SELECT device_name FROM devices WHERE id = $1',
        [deviceId]
    );

    // 7. Check paused status
    const statusResult = await pool.query(
        'SELECT paused_until FROM device_status WHERE device_id = $1',
        [deviceId]
    );
    const pausedUntil = statusResult.rows[0]?.paused_until || null;

    // Parse blocked/allowed apps from JSON
    let blockedApps = [];
    let alwaysAllowedApps = [];
    try {
        blockedApps = typeof child.blocked_apps === 'string'
            ? JSON.parse(child.blocked_apps)
            : (child.blocked_apps || []);
        alwaysAllowedApps = typeof child.always_allowed_apps === 'string'
            ? JSON.parse(child.always_allowed_apps)
            : (child.always_allowed_apps || []);
    } catch { /* use defaults */ }

    return {
        deviceName: deviceResult.rows[0]?.device_name || 'Unknown',
        childName: child.name,
        childId: child.id,
        dailyLimitMinutes,
        bonusMinutes,
        remainingMinutes,
        usedMinutes,
        blockedApps,
        alwaysAllowedApps,
        activeSchedule,
        pausedUntil
    };
}

module.exports = router;
module.exports.authenticateDevice = authenticateDevice;
