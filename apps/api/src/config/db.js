/**
 * Database Configuration and Initialization
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// SEC-003: Database configuration from environment
const DB_CONFIG = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'screensprout',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    // Add SSL for production if needed (default to true in prod, but allow override)
    ssl: (process.env.NODE_ENV === 'production' && process.env.DB_SSL_REQUIRED !== 'false')
        ? { rejectUnauthorized: false }
        : false
};

// Validate password
if (!DB_CONFIG.password && process.env.NODE_ENV !== 'test') {
    console.error('FATAL ERROR: DB_PASSWORD environment variable is not set');
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

/**
 * Create a new database pool or return the one provided in options
 * @param {Object} options - Options containing existing pool
 */
function createPool(options = {}) {
    const pool = options.pool || new Pool(DB_CONFIG);

    // Log unexpected pool errors
    pool.on('error', (err, client) => {
        console.error('Unexpected error on idle database client:', err);
    });

    return pool;
}

/**
 * Initialize the database schema
 * @param {Object} pool - Database pool
 */
async function initDb(pool) {
    try {
        // Look for schema.sql in root or current dir (depending on where this is run)
        // Assuming this file is in src/config/
        const schemaPath = path.resolve(__dirname, '../../schema.sql');

        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            await pool.query(schemaSql);
            console.log('Database schema initialized.');
        } else {
            console.warn('schema.sql not found at expected path:', schemaPath);
        }
    } catch (err) {
        console.error('Failed to initialize database schema:', err);
    }
}

module.exports = { createPool, initDb, DB_CONFIG };
