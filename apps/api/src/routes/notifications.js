/**
 * Notification Routes
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

const router = express.Router();

// Get notifications
router.get('/', authenticateToken, async (req, res) => {
    const { limit = 50, unreadOnly = false } = req.query;
    const pool = req.app.get('db');

    try {
        let query = 'SELECT * FROM notifications WHERE user_id = $1';
        const params = [req.user.id];

        if (unreadOnly === 'true') {
            query += ' AND is_read = false';
        }

        query += ' ORDER BY created_at DESC LIMIT $2';
        params.push(parseInt(limit));

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('[Notifications] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get unread count
router.get('/unread-count', authenticateToken, async (req, res) => {
    const pool = req.app.get('db');
    try {
        const result = await pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
            [req.user.id]
        );
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        console.error('[Notifications] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Mark all as read
router.put('/read-all', authenticateToken, csrfProtection, async (req, res) => {
    const pool = req.app.get('db');
    try {
        await pool.query(
            'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
            [req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('[Notifications] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Mark one as read
router.put('/:id/read', authenticateToken, csrfProtection, async (req, res) => {
    const pool = req.app.get('db');
    try {
        const result = await pool.query(
            'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('[Notifications] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete notification
router.delete('/:id', authenticateToken, csrfProtection, async (req, res) => {
    const pool = req.app.get('db');
    try {
        await pool.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('[Notifications] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
