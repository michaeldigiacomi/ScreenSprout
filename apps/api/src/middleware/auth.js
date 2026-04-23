/**
 * Authentication Middleware and Helpers
 */

const jwt = require('jsonwebtoken');

// SEC-002: JWT Secret - No fallback in production
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h';
const BCRYPT_ROUNDS = process.env.NODE_ENV === 'test' ? 1 : (parseInt(process.env.BCRYPT_ROUNDS) || 10);

if (!JWT_SECRET && process.env.NODE_ENV !== 'test') {
    console.error('FATAL ERROR: JWT_SECRET environment variable is not set');
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

/**
 * Helper to verify device ownership
 */
async function verifyDeviceOwnership(deviceId, userId, pool) {
    const result = await pool.query(
        'SELECT 1 FROM devices WHERE id = $1 AND user_id = $2',
        [deviceId, userId]
    );
    return result.rows.length > 0;
}

/**
 * Helper to verify child ownership
 */
async function verifyChildOwnership(childId, userId, pool) {
    const result = await pool.query(
        'SELECT 1 FROM children WHERE id = $1 AND user_id = $2',
        [childId, userId]
    );
    return result.rows.length > 0;
}

module.exports = {
    authenticateToken,
    verifyDeviceOwnership,
    verifyChildOwnership,
    JWT_SECRET,
    JWT_EXPIRATION,
    BCRYPT_ROUNDS
};
