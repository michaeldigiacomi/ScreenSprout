/**
 * Children Routes
 */

const express = require('express');
const { randomUUID } = require('crypto');
const { authenticateToken, verifyChildOwnership } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

const router = express.Router();

// Get all children for user
router.get('/', authenticateToken, async (req, res) => {
    const pool = req.app.get('db');
    try {
        // 1. Get children
        const childrenResult = await pool.query(
            'SELECT * FROM children WHERE user_id = $1 ORDER BY name ASC',
            [req.user.id]
        );
        const children = childrenResult.rows;

        if (children.length === 0) {
            return res.json([]);
        }

        const childIds = children.map(c => c.id);

        // 2. Get devices for these children
        const devicesResult = await pool.query(
            'SELECT id, child_id, device_name, device_type FROM devices WHERE child_id = ANY($1)',
            [childIds]
        );
        const devices = devicesResult.rows;

        // 3. Get usage for these devices (today)
        // Note: pg-mem might struggle with ANY($1) on arrays if not setup correctly, 
        // but let's try. Alternatively, loop.
        // Or select all usage for user's devices and filter in JS.

        // Simpler for pg-mem compatibility: Get usage for all devices belonging to user
        const usageResult = await pool.query(
            `SELECT d.child_id, SUM(al.duration_seconds) as used_seconds
       FROM activity_logs al
       JOIN devices d ON al.device_id = d.id
       WHERE d.user_id = $1 AND al.timestamp >= CURRENT_DATE::timestamptz
       GROUP BY d.child_id`,
            [req.user.id]
        );

        const usageMap = new Map();
        usageResult.rows.forEach(row => {
            usageMap.set(row.child_id, parseInt(row.used_seconds || 0));
        });

        // Combine
        const result = children.map(child => {
            const childDevices = devices.filter(d => d.child_id === child.id);
            const usage = usageMap.get(child.id) || 0;
            return {
                ...child,
                devices: childDevices,
                used_seconds: usage
            };
        });

        res.json(result);
    } catch (err) {
        console.error('[Children] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get a single child
router.get('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const pool = req.app.get('db');

    try {
        // Verify ownership
        const childResult = await pool.query(
            'SELECT * FROM children WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (childResult.rows.length === 0) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const child = childResult.rows[0];

        // Get devices for this child
        const devicesResult = await pool.query(
            'SELECT id, device_name, device_type, last_seen FROM devices WHERE child_id = $1',
            [id]
        );
        child.devices = devicesResult.rows;

        res.json(child);
    } catch (err) {
        console.error('[Children] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a child profile
router.post('/', authenticateToken, csrfProtection, async (req, res) => {
    const { name, dailyLimitMinutes, blockedApps } = req.body;
    const pool = req.app.get('db');

    // Input validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name is required' });
    }
    if (name.length > 100) {
        return res.status(400).json({ error: 'Name must be 100 characters or less' });
    }
    if (dailyLimitMinutes !== undefined) {
        const limit = parseInt(dailyLimitMinutes);
        if (isNaN(limit) || limit < 1 || limit > 1440) {
            return res.status(400).json({ error: 'dailyLimitMinutes must be between 1 and 1440' });
        }
    }
    if (blockedApps !== undefined && !Array.isArray(blockedApps)) {
        return res.status(400).json({ error: 'blockedApps must be an array' });
    }

    try {
        const id = randomUUID();
        const result = await pool.query(
            `INSERT INTO children (id, user_id, name, daily_limit_minutes, blocked_apps)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [id, req.user.id, name.trim(), dailyLimitMinutes || 120, JSON.stringify(blockedApps || [])]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[Children] Error creating child:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a child profile
router.put('/:id', authenticateToken, csrfProtection, async (req, res) => {
    const { id } = req.params;
    const { name, dailyLimitMinutes, blockedApps, alwaysAllowedApps } = req.body;
    const pool = req.app.get('db');

    // Input validation
    if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: 'Name cannot be empty' });
        }
        if (name.length > 100) {
            return res.status(400).json({ error: 'Name must be 100 characters or less' });
        }
    }
    if (dailyLimitMinutes !== undefined) {
        const limit = parseInt(dailyLimitMinutes);
        if (isNaN(limit) || limit < 1 || limit > 1440) {
            return res.status(400).json({ error: 'dailyLimitMinutes must be between 1 and 1440' });
        }
    }
    if (blockedApps !== undefined && !Array.isArray(blockedApps)) {
        return res.status(400).json({ error: 'blockedApps must be an array' });
    }
    if (alwaysAllowedApps !== undefined && !Array.isArray(alwaysAllowedApps)) {
        return res.status(400).json({ error: 'alwaysAllowedApps must be an array' });
    }

    try {
        // Verify ownership
        const childCheck = await pool.query(
            'SELECT id FROM children WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (childCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const result = await pool.query(
            `UPDATE children 
       SET name = $1, daily_limit_minutes = $2, blocked_apps = $3, always_allowed_apps = $4
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
            [
                name,
                dailyLimitMinutes || 120,
                JSON.stringify(blockedApps || []),
                JSON.stringify(alwaysAllowedApps || []),
                id,
                req.user.id
            ]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('[Children] Error updating child:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a child
router.delete('/:id', authenticateToken, csrfProtection, async (req, res) => {
    const { id } = req.params;
    const pool = req.app.get('db');

    try {
        // Verify ownership
        const childCheck = await pool.query(
            'SELECT id FROM children WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (childCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Child not found' });
        }

        await pool.query('DELETE FROM children WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('[Children] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
