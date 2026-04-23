const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'peopletracker',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function run() {
    try {
        const res = await pool.query('SELECT * FROM users');
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
