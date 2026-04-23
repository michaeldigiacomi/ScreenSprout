/**
 * Settings Routes
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

const router = express.Router();

// Get theme
router.get('/theme', authenticateToken, async (req, res) => {
    const pool = req.app.get('db');
    try {
        const result = await pool.query(
            'SELECT theme FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ theme: result.rows[0].theme || 'system' });
    } catch (err) {
        console.error('[Settings] Error fetching theme:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update theme
router.put('/theme', authenticateToken, csrfProtection, async (req, res) => {
    const { theme } = req.body;
    const pool = req.app.get('db');

    // Validate theme value
    if (!theme || !['light', 'dark', 'system'].includes(theme)) {
        return res.status(400).json({ error: 'Invalid theme. Must be light, dark, or system' });
    }

    try {
        await pool.query(
            'UPDATE users SET theme = $1 WHERE id = $2',
            [theme, req.user.id]
        );

        res.json({ success: true, theme });
    } catch (err) {
        console.error('[Settings] Error updating theme:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
