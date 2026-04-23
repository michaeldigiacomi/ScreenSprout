/**
 * Schedules Routes
 */

const express = require('express');
const { authenticateToken, verifyChildOwnership } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

const router = express.Router();

// Get schedules for a child
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
            'SELECT * FROM schedules WHERE child_id = $1 ORDER BY created_at DESC',
            [childId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('[Schedules] Error fetching schedules:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a schedule
router.post('/', authenticateToken, csrfProtection, async (req, res) => {
    const { childId, name, description, days_of_week, start_time, end_time, blocked_apps, always_allowed_apps, is_active } = req.body;
    const pool = req.app.get('db');

    if (!childId || !name || !days_of_week || !start_time || !end_time) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Verify child ownership
        const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
        if (!isOwner) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const result = await pool.query(
            `INSERT INTO schedules (child_id, name, description, days_of_week, start_time, end_time, blocked_apps, always_allowed_apps, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [childId, name, description, days_of_week, start_time, end_time, blocked_apps || [], always_allowed_apps || [], is_active !== undefined ? is_active : true]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('[Schedules] Error creating schedule:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a schedule
router.put('/:id', authenticateToken, csrfProtection, async (req, res) => {
    const { id } = req.params;
    const { name, description, days_of_week, start_time, end_time, blocked_apps, always_allowed_apps, is_active } = req.body;
    const pool = req.app.get('db');

    try {
        // Verify ownership through child relationship
        const checkResult = await pool.query(
            `SELECT s.child_id FROM schedules s
             JOIN children c ON s.child_id = c.id
             WHERE s.id = $1 AND c.user_id = $2`,
            [id, req.user.id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        const result = await pool.query(
            `UPDATE schedules
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 days_of_week = COALESCE($3, days_of_week),
                 start_time = COALESCE($4, start_time),
                 end_time = COALESCE($5, end_time),
                 blocked_apps = COALESCE($6, blocked_apps),
                 always_allowed_apps = COALESCE($7, always_allowed_apps),
                 is_active = COALESCE($8, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $9
             RETURNING *`,
            [name, description, days_of_week, start_time, end_time, blocked_apps, always_allowed_apps, is_active, id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('[Schedules] Error updating schedule:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a schedule
router.delete('/:id', authenticateToken, csrfProtection, async (req, res) => {
    const { id } = req.params;
    const pool = req.app.get('db');

    try {
        // Verify ownership through child relationship
        const checkResult = await pool.query(
            `SELECT s.child_id FROM schedules s
             JOIN children c ON s.child_id = c.id
             WHERE s.id = $1 AND c.user_id = $2`,
            [id, req.user.id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        await pool.query('DELETE FROM schedules WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('[Schedules] Error deleting schedule:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Toggle schedule active status
router.patch('/:id/toggle', authenticateToken, csrfProtection, async (req, res) => {
    const { id } = req.params;
    const pool = req.app.get('db');

    try {
        // Verify ownership through child relationship
        const checkResult = await pool.query(
            `SELECT s.child_id, s.is_active FROM schedules s
             JOIN children c ON s.child_id = c.id
             WHERE s.id = $1 AND c.user_id = $2`,
            [id, req.user.id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        const currentActive = checkResult.rows[0].is_active;

        const result = await pool.query(
            `UPDATE schedules
             SET is_active = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [!currentActive, id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('[Schedules] Error toggling schedule:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;