/**
 * CSRF Protection Middleware
 * 
 * Uses stateless signed tokens (JWT) to validate CSRF tokens.
 * Tokens expire after 1 hour. No server-side state required.
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { JWT_SECRET } = require('./auth');

const CSRF_TOKEN_TTL = '1h'; // 1 hour

/**
 * Generate a stateless CSRF token
 * Encodes a random nonce and timestamp, signed with the server secret
 */
function generateCsrfToken() {
    const nonce = crypto.randomBytes(16).toString('hex');
    const payload = {
        nonce,
        type: 'csrf'
    };

    // Sign the token
    return jwt.sign(payload, JWT_SECRET, { expiresIn: CSRF_TOKEN_TTL });
}

/**
 * CSRF middleware - validates token signature and expiration
 */
function csrfProtection(req, res, next) {
    const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

    if (!mutatingMethods.includes(req.method)) {
        return next();
    }

    // Skip CSRF for login/register endpoints (they don't have a session yet)
    // Note: Login doesn't need CSRF if we don't have a session cookie yet,
    // but if we do (e.g. re-auth), we might want it.
    // For now, keeping existing exemption.
    // Use mount-stripped paths since this middleware is used per-route inside mounted routers
    const skipPaths = ['/login', '/register'];
    if (skipPaths.includes(req.path)) {
        return next();
    }

    const headerToken = req.headers['x-csrf-token'];

    if (!headerToken) {
        console.warn(`[CSRF] Missing CSRF token for ${req.method} ${req.path}`);
        return res.status(403).json({ error: 'Invalid or missing CSRF token' });
    }

    // Verify token signature and expiration
    jwt.verify(headerToken, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.warn(`[CSRF] Invalid/Expired CSRF token for ${req.method} ${req.path}:`, err.message);
            // Return 'token' or 'csrf' in error to trigger client retry
            return res.status(403).json({ error: 'Invalid or expired CSRF token' });
        }

        // Check type to prevent using auth tokens as CSRF tokens
        if (decoded.type !== 'csrf') {
            console.warn(`[CSRF] Token type mismatch for ${req.method} ${req.path}`);
            return res.status(403).json({ error: 'Invalid CSRF token type' });
        }

        next();
    });
}

// Expose dummy store size for testing compatibility
function _getStoreSize() {
    return 0;
}

module.exports = { csrfProtection, generateCsrfToken, _getStoreSize };
