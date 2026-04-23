/**
 * API Gaps Integration Tests
 * 
 * Tests for new routes: geofences, locations, bonus-time, single child
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test';

const request = require('supertest');
const { createApp } = require('../../app');
const { setupTestDatabase, teardownTestDatabase, getTestPool, clearTestData } = require('../setup');
const { testUsers, getValidCredentials } = require('../fixtures/users');
const { testChildren, CHILD_IDS } = require('../fixtures/children');

describe('API Gaps', () => {
    let app;
    let pool;
    let authToken;

    beforeAll(async () => {
        await setupTestDatabase();
        pool = getTestPool();

        // Make sure tables exist (schema.sql should have been applied by setupTestDatabase)
        // accessing pool to verify if needed, but confident in setup

        const appData = createApp({ pool, skipWebSocket: true, skipDbInit: true });
        app = appData.app;
    });

    afterAll(async () => {
        await teardownTestDatabase();
    });

    beforeEach(async () => {
        await clearTestData();

        // Seed test users
        for (const user of testUsers) {
            await pool.query(
                `INSERT INTO users (id, username, password_hash, created_at)
         VALUES ($1, $2, $3, $4)`,
                [user.id, user.username, user.password_hash, user.created_at]
            );
        }

        // Seed test children
        for (const child of testChildren) {
            await pool.query(
                `INSERT INTO children (id, user_id, name, daily_limit_minutes, blocked_apps, always_allowed_apps, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [child.id, child.user_id, child.name, child.daily_limit_minutes, child.blocked_apps, child.always_allowed_apps, child.created_at]
            );
        }

        // Login
        const credentials = getValidCredentials('testparent');
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send(credentials);
        authToken = loginResponse.body.token;
    });

    describe('GET /api/children/:id', () => {
        it('should return a single child', async () => {
            const response = await request(app)
                .get(`/api/children/${CHILD_IDS.child1}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.id).toBe(CHILD_IDS.child1);
            expect(response.body.name).toBe('Child One');
            expect(response.body).toHaveProperty('devices');
        });

        it('should return 404 for unknown child', async () => {
            await request(app)
                .get('/api/children/123e4567-e89b-12d3-a456-426614174099')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });
    });

    describe('Geofences API', () => {
        it('should create and list geofences', async () => {
            // Get CSRF Token
            const csrfRes = await request(app).get('/api/auth/csrf-token').set('Authorization', `Bearer ${authToken}`);
            const csrfToken = csrfRes.body.csrfToken;

            // Create
            const createRes = await request(app)
                .post('/api/geofences')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send({
                    childId: CHILD_IDS.child1,
                    name: 'Home',
                    latitude: 40.7128,
                    longitude: -74.0060,
                    radius: 100
                })
                .expect(201);

            expect(createRes.body.name).toBe('Home');

            // List
            const listRes = await request(app)
                .get(`/api/geofences?childId=${CHILD_IDS.child1}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(listRes.body).toHaveLength(1);
            expect(listRes.body[0].name).toBe('Home');
        });
    });

    describe('Locations API', () => {
        it('should return location history', async () => {
            // Seed location
            await pool.query(
                `INSERT INTO location_history (child_id, device_id, latitude, longitude, timestamp)
               VALUES ($1, $2, 40.7, -74.0, NOW())`,
                [CHILD_IDS.child1, '11111111-1111-1111-1111-111111111111'] // Need valid device UUID
            );
            // Wait, reference check on device_id? Yes, schema has foreign key.
            // Need to seed device first.
            await pool.query(
                `INSERT INTO devices (id, user_id, child_id, device_name, device_type)
             VALUES ($1, $2, $3, 'Test Device', 'android')`,
                ['11111111-1111-1111-1111-111111111111', 1002, CHILD_IDS.child1]
            );

            // Seed location again
            await pool.query(
                `INSERT INTO location_history (child_id, device_id, latitude, longitude, timestamp)
               VALUES ($1, $2, 40.7, -74.0, NOW())`,
                [CHILD_IDS.child1, '11111111-1111-1111-1111-111111111111']
            );

            const res = await request(app)
                .get(`/api/locations/${CHILD_IDS.child1}/history`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body).toHaveLength(1);
            expect(res.body[0].latitude).toBe('40.70000000'); // decimal string usually
        });

        it('should return stats', async () => {
            const res = await request(app)
                .get(`/api/locations/stats/${CHILD_IDS.child1}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body).toHaveProperty('total_points');
        });
    });

    describe('Bonus Time API', () => {
        it('should return available time', async () => {
            // Seed bonus time
            await pool.query(
                `INSERT INTO bonus_time_grants (child_id, granted_by, minutes)
               VALUES ($1, $2, 30)`,
                [CHILD_IDS.child1, 1002]
            );

            const res = await request(app)
                .get(`/api/bonus-time/available?childId=${CHILD_IDS.child1}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body.totalMinutes).toBe(30);
            expect(res.body.grantCount).toBe(1);
        });
    });
});
