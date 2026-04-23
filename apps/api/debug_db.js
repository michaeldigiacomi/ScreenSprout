const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'peopletracker',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function debug() {
    try {
        const users = await pool.query('SELECT id, username FROM users');
        console.log('Users:', users.rows);

        const devices = await pool.query('SELECT id, user_id, device_name, device_type FROM devices');
        console.log('Devices:', devices.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
debug();
