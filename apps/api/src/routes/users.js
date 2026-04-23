/**
 * User/Profile Routes
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

const router = express.Router();

// --- Profile ---

router.get('/profile', authenticateToken, async (req, res) => {
    const pool = req.app.get('db');
    try {
        const result = await pool.query('SELECT id, username, full_name, email, bio, theme FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[Users] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/profile', authenticateToken, csrfProtection, async (req, res) => {
    const { full_name, email, bio } = req.body;
    const pool = req.app.get('db');

    // Input validation
    if (full_name !== undefined && full_name.length > 200) {
        return res.status(400).json({ error: 'Full name must be 200 characters or less' });
    }
    if (email !== undefined && email.length > 0) {
        // Basic email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
    }
    if (bio !== undefined && bio.length > 1000) {
        return res.status(400).json({ error: 'Bio must be 1000 characters or less' });
    }

    try {
        const result = await pool.query(
            'UPDATE users SET full_name = $1, email = $2, bio = $3 WHERE id = $4 RETURNING id, username, full_name, email, bio, theme',
            [full_name, email, bio, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[Users] Error updating profile:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- Shared Access ---

router.get('/share', authenticateToken, async (req, res) => {
    const pool = req.app.get('db');
    try {
        const result = await pool.query(
            'SELECT * FROM shared_access WHERE owner_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[Users] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/share/invite', authenticateToken, csrfProtection, async (req, res) => {
    const { viewerEmail } = req.body;
    const pool = req.app.get('db');
    try {
        // In a real app, we would send an email here.
        // For MVP, we just create the record.
        const result = await pool.query(
            'INSERT INTO shared_access (owner_id, viewer_email, status) VALUES ($1, $2, $3) RETURNING *',
            [req.user.id, viewerEmail, 'pending']
        );
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Already shared with this email' });
        console.error('[Users] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/share/:id', authenticateToken, csrfProtection, async (req, res) => {
    const { id } = req.params;
    const pool = req.app.get('db');
    try {
        // Verify ownership before deleting
        const checkResult = await pool.query(
            'SELECT 1 FROM shared_access WHERE id = $1 AND owner_id = $2',
            [id, req.user.id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Shared access not found' });
        }

        await pool.query('DELETE FROM shared_access WHERE id = $1', [id]);
        res.json({ message: 'Shared access removed' });
    } catch (err) {
        console.error('Failed to delete shared access:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Accept a shared access invitation
router.put('/share/:id/accept', authenticateToken, csrfProtection, async (req, res) => {
    const { id } = req.params;
    const pool = req.app.get('db');
    try {
        // Verify the current user is the viewer for this invitation
        const checkResult = await pool.query(
            'SELECT * FROM shared_access WHERE id = $1 AND viewer_email = $2 AND status = $3',
            [id, req.user.email, 'pending']
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Pending invitation not found' });
        }

        const result = await pool.query(
            'UPDATE shared_access SET status = $1 WHERE id = $2 RETURNING *',
            ['accepted', id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Failed to accept shared access:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reject a shared access invitation
router.put('/share/:id/reject', authenticateToken, csrfProtection, async (req, res) => {
    const { id } = req.params;
    const pool = req.app.get('db');
    try {
        // Verify the current user is the viewer for this invitation
        const checkResult = await pool.query(
            'SELECT * FROM shared_access WHERE id = $1 AND viewer_email = $2 AND status = $3',
            [id, req.user.email, 'pending']
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Pending invitation not found' });
        }

        const result = await pool.query(
            'UPDATE shared_access SET status = $1 WHERE id = $2 RETURNING *',
            ['rejected', id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Failed to reject shared access:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// List shared access invitations for the current user (as viewer)
router.get('/share/invitations', authenticateToken, async (req, res) => {
    const pool = req.app.get('db');
    try {
        const result = await pool.query(
            `SELECT sa.*, u.username as owner_name
             FROM shared_access sa
             JOIN users u ON sa.owner_id = u.id
             WHERE sa.viewer_email = $1
             ORDER BY sa.created_at DESC`,
            [req.user.email]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Failed to fetch invitations:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
