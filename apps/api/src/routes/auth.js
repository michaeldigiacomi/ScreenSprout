/**
 * Auth Routes
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authLimiter } = require('../middleware/rateLimit');
const { generateCsrfToken, csrfProtection } = require('../middleware/csrf');
const { authenticateToken, JWT_SECRET, JWT_EXPIRATION, BCRYPT_ROUNDS } = require('../middleware/auth');

const router = express.Router();

// CSRF Token endpoint
router.get('/csrf-token', (req, res) => {
    const token = generateCsrfToken();
    res.cookie('csrf-token', token, {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    res.json({ csrfToken: token });
});

router.post('/login', authLimiter, async (req, res) => {
    const { username, password } = req.body;
    const pool = req.app.get('db');

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = result.rows[0];

        // SEC-001: Verify password with bcrypt
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) return res.status(401).json({ error: 'Invalid credentials' });

        // SEC-002: JWT with expiration
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRATION }
        );

        res.json({ token, user: { id: user.id, username: user.username, theme: user.theme || 'system' } });
    } catch (err) {
        console.error('[Auth] Error during login:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/register', authLimiter, async (req, res) => {
    const { username, password } = req.body;
    const pool = req.app.get('db');

    // Validate inputs
    if (!username || username.trim() === '') {
        return res.status(400).json({ error: 'Username is required' });
    }

    if (username.length > 50) {
        return res.status(400).json({ error: 'Username must be 50 characters or less' });
    }

    // Validate password strength
    if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Password complexity: at least one uppercase, one lowercase, one digit
    if (!/[A-Z]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least one digit' });
    }

    try {
        // SEC-001: Hash password with bcrypt
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        const result = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
            [username.trim(), passwordHash]
        );
        const user = result.rows[0];

        // SEC-002: JWT with expiration
        // TODO: Implement email verification before issuing token
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRATION }
        );

        res.json({ token, user });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Username already exists' });
        console.error('[Auth] Error during registration:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// SEC-001: Change password with bcrypt
router.post('/change-password', authenticateToken, csrfProtection, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const pool = req.app.get('db');

    // Validate new password strength
    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(newPassword)) {
        return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(newPassword)) {
        return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(newPassword)) {
        return res.status(400).json({ error: 'Password must contain at least one digit' });
    }

    try {
        // Verify current password
        const userResult = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password with bcrypt
        const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

        // Update password
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [newPasswordHash, req.user.id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('[Settings] Error changing password:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
