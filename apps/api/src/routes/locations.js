/**
 * Locations Routes
 */

const express = require('express');
const { authenticateToken, verifyChildOwnership } = require('../middleware/auth');

const router = express.Router();

// Get location history for a child
router.get('/:childId/history', authenticateToken, async (req, res) => {
    const { childId } = req.params;
    const { startTime, endTime, limit = 100 } = req.query;
    const pool = req.app.get('db');

    try {
        // Verify child ownership
        const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
        if (!isOwner) {
            return res.status(404).json({ error: 'Child not found' });
        }

        let query = 'SELECT * FROM location_history WHERE child_id = $1';
        const params = [childId];
        let paramCount = 1;

        if (startTime) {
            paramCount++;
            query += ` AND timestamp >= $${paramCount}`;
            params.push(startTime);
        }

        if (endTime) {
            paramCount++;
            query += ` AND timestamp <= $${paramCount}`;
            params.push(endTime);
        }

        query += ` ORDER BY timestamp DESC LIMIT $${paramCount + 1}`;
        params.push(limit);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('[Locations] Error fetching history:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get location stats for a child
router.get('/stats/:childId', authenticateToken, async (req, res) => {
    const { childId } = req.params;
    const days = parseInt(req.query.days) || 7;
    const pool = req.app.get('db');

    try {
        // Verify child ownership
        const isOwner = await verifyChildOwnership(childId, req.user.id, pool);
        if (!isOwner) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const stats = await pool.query(
            `SELECT 
                COUNT(*) as total_points,
                MAX(timestamp) as last_seen,
                MIN(timestamp) as first_seen
             FROM location_history 
             WHERE child_id = $1 AND timestamp > NOW() - make_interval(days => $2)`,
            [childId, days]
        );

        res.json(stats.rows[0]);
    } catch (err) {
        console.error('[Locations] Error fetching stats:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
