/**
 * Geofences Routes
 */

const express = require('express');
const { authenticateToken, verifyChildOwnership } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

const router = express.Router();

// Get geofences for a child
router.get('/', authenticateToken, async (req, res) => {
    const { childId } = req.query;
    const pool = req.app.get('db');

    if (!childId) {
        return res.status(400).json({ error: 'childId is required' });
    }

    try {
        // Verify child ownership
        const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
        if (!isOwner) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const result = await pool.query(
            'SELECT * FROM geofences WHERE child_id = $1 ORDER BY created_at DESC',
            [childId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('[Geofences] Error fetching geofences:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a geofence
router.post('/', authenticateToken, csrfProtection, async (req, res) => {
    const { childId, name, description, latitude, longitude, radius, type } = req.body;
    const pool = req.app.get('db');

    if (!childId || !name || !latitude || !longitude || !radius) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Verify child ownership
        const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
        if (!isOwner) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const result = await pool.query(
            `INSERT INTO geofences (child_id, user_id, name, description, latitude, longitude, radius_meters, geofence_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [childId, req.user.id, name, description, latitude, longitude, radius, type || 'safe']
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('[Geofences] Error creating geofence:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a geofence
router.put('/:id', authenticateToken, csrfProtection, async (req, res) => {
    const { id } = req.params;
    const { name, description, latitude, longitude, radius, type, isActive } = req.body;
    const pool = req.app.get('db');

    try {
        // Verify ownership
        const checkResult = await pool.query(
            'SELECT 1 FROM geofences WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Geofence not found' });
        }

        const result = await pool.query(
            `UPDATE geofences 
             SET name = COALESCE($1, name), 
                 description = COALESCE($2, description), 
                 latitude = COALESCE($3, latitude), 
                 longitude = COALESCE($4, longitude), 
                 radius_meters = COALESCE($5, radius_meters), 
                 geofence_type = COALESCE($6, geofence_type),
                 is_active = COALESCE($7, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $8 AND user_id = $9
             RETURNING *`,
            [name, description, latitude, longitude, radius, type, isActive, id, req.user.id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('[Geofences] Error updating geofence:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a geofence
router.delete('/:id', authenticateToken, csrfProtection, async (req, res) => {
    const { id } = req.params;
    const pool = req.app.get('db');

    try {
        // Verify ownership
        const checkResult = await pool.query(
            'SELECT 1 FROM geofences WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Geofence not found' });
        }

        await pool.query('DELETE FROM geofences WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('[Geofences] Error deleting geofence:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get geofence events
router.get('/events/:childId', authenticateToken, async (req, res) => {
    const { childId } = req.params;
    const { limit = 50 } = req.query;
    const pool = req.app.get('db');

    try {
        // Verify child ownership
        const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
        if (!isOwner) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const result = await pool.query(
            `SELECT ge.*, g.name as geofence_name
             FROM geofence_events ge
             JOIN geofences g ON ge.geofence_id = g.id
             WHERE ge.child_id = $1
             ORDER BY ge.timestamp DESC
             LIMIT $2`,
            [childId, limit]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('[Geofences] Error fetching events:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
