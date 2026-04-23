
const { createPool } = require('../src/config/db');
require('dotenv').config();

async function fixSchema() {
    const pool = createPool();
    const client = await pool.connect();

    try {
        console.log('Connected to database. Starting schema fix...');

        await client.query('BEGIN');

        // 1. Fix analytics_user_flows constraint
        console.log('Checking analytics_user_flows constraints...');

        // Check if the unique constraint already exists
        const constraintCheck = await client.query(`
      SELECT con.conname
      FROM pg_catalog.pg_constraint con
      INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
      INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace
      WHERE nsp.nspname = 'public'
      AND rel.relname = 'analytics_user_flows'
      AND con.contype = 'u';
    `);

        // If we don't see a specific named constraint or unique index on session_id, we add it.
        // The previous error was "there is no unique or exclusion constraint matching the ON CONFLICT specification"
        // The query uses `ON CONFLICT (session_id)`.

        // We'll try to add a unique index on session_id if one doesn't exist.
        await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_user_flows_session_id 
      ON analytics_user_flows (session_id);
    `);

        // To support ON CONFLICT (session_id), a unique index is usually sufficient, 
        // but sometimes explicit constraints are better. Let's add a named constraint if needed.
        // However, existing unique index should work. Let's explicitly add a constraint backed by the index 
        // or just add the constraint directly if it's missing.

        // Safe approach: Try to add unique constraint, catch if it exists.
        try {
            await client.query(`
            ALTER TABLE analytics_user_flows 
            ADD CONSTRAINT analytics_user_flows_session_id_key UNIQUE (session_id);
        `);
            console.log('Added UNIQUE constraint to analytics_user_flows(session_id)');
        } catch (err) {
            if (err.code === '42P07') { // duplicate_table (relation already exists) or similar for constraints
                console.log('UNIQUE constraint on analytics_user_flows(session_id) already exists or index is sufficient.');
            } else {
                console.log('Note: Could not add explicit UNIQUE constraint (might already have unique index):', err.message);
            }
        }

        // 2. Create pairing_codes table
        console.log('Creating pairing_codes table if needed...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS pairing_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(6) NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        device_name VARCHAR(100) DEFAULT 'New Device',
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT false,
        used_by_device_id UUID REFERENCES devices(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_pairing_codes_code ON pairing_codes(code) WHERE used = false;`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_pairing_codes_user ON pairing_codes(user_id);`);
        console.log('pairing_codes table verified.');

        // 3. Create device_tokens table
        console.log('Creating device_tokens table if needed...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS device_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        token_hash VARCHAR(128) NOT NULL,
        revoked BOOLEAN DEFAULT false,
        revoked_at TIMESTAMP WITH TIME ZONE,
        last_used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_hash ON device_tokens(token_hash) WHERE revoked = false;`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_device_tokens_device ON device_tokens(device_id);`);
        console.log('device_tokens table verified.');

        await client.query('COMMIT');
        console.log('Schema fix completed successfully successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error fixing schema:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

fixSchema();
