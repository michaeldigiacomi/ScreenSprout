const { Pool } = require('pg');
const axios = require('axios');
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
        console.log("--- DATABASE USERS ---");
        const users = await pool.query('SELECT id, username FROM users');
        console.table(users.rows);

        console.log("\n--- SIMULATING 'testparent' LOGIN & FETCH ---");
        // 1. Login
        try {
            const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
                username: process.env.TEST_USER || 'testparent',
                password: process.env.TEST_PASSWORD
            });
            const token = loginRes.data.token;
            console.log("Login successful. Token obtained.");

            // 2. Fetch Devices
            const devicesRes = await axios.get('http://localhost:3000/api/devices', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`API returned ${devicesRes.data.length} devices.`);
            console.table(devicesRes.data);

        } catch (apiErr) {
            console.error("API Error:", apiErr.message);
            if (apiErr.response) console.error("Data:", apiErr.response.data);
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
