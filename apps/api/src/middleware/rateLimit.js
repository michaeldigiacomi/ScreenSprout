/**
 * Rate Limiting Middleware
 */

const rateLimit = require('express-rate-limit');

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 300, // Limit each IP to 300 requests per minute
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (_req, _res) => process.env.NODE_ENV === 'test',
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 failed login attempts per windowMs
    message: { error: 'Too many login attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
    skip: (_req, _res) => process.env.NODE_ENV === 'test',
});

module.exports = { limiter, authLimiter };
