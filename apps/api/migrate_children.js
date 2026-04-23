const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'peopletracker',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function migrate() {
    try {
        console.log("Creating children table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS children (
                id UUID PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                name VARCHAR(100) NOT NULL,
                daily_limit_minutes INTEGER DEFAULT 120,
                blocked_apps JSONB DEFAULT '[]',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Checking if device.child_id exists...");
        try {
            await pool.query(`ALTER TABLE devices ADD COLUMN child_id UUID REFERENCES children(id);`);
            console.log("Column child_id added.");
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log("Column child_id already exists.");
            } else {
                console.error("Error adding column:", e.message);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
migrate();
