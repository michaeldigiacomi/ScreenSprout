/**
 * Settings API Integration Tests
 * 
 * Tests for user settings (e.g., theme)
 */

// Set required environment variables before importing app
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test';

const request = require('supertest');
const { createApp } = require('../../app');
const { setupTestDatabase, teardownTestDatabase, getTestPool, clearTestData } = require('../setup');
const { testUsers, getValidCredentials } = require('../fixtures/users');

describe('Settings API', () => {
    let app;
    let pool;
    let authToken;
    let csrfToken;

    beforeAll(async () => {
        await setupTestDatabase();
        pool = getTestPool();
        const appData = createApp({ pool, skipWebSocket: true, skipDbInit: true });
        app = appData.app;
    });

    afterAll(async () => {
        await teardownTestDatabase();
    });

    beforeEach(async () => {
        await clearTestData();

        // Seed Users
        for (const user of testUsers) {
            await pool.query(
                `INSERT INTO users (id, username, password_hash, theme, created_at) VALUES ($1, $2, $3, $4, $5)`,
                [user.id, user.username, user.password_hash, 'system', user.created_at]
            );
        }

        // Login
        const credentials = getValidCredentials('testparent');
        const loginRes = await request(app).post('/api/auth/login').send(credentials);
        authToken = loginRes.body.token;

        // Get CSRF
        const csrfRes = await request(app).get('/api/auth/csrf-token').set('Authorization', `Bearer ${authToken}`);
        csrfToken = csrfRes.body.csrfToken;
    });

    it('should get current theme', async () => {
        const res = await request(app)
            .get('/api/settings/theme')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(res.body.theme).toBe('system');
    });

    it('should update theme', async () => {
        const res = await request(app)
            .put('/api/settings/theme')
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-CSRF-Token', csrfToken)
            .set('Cookie', [`csrf-token=${csrfToken}`])
            .send({ theme: 'dark' })
            .expect(200);

        expect(res.body.theme).toBe('dark');

        // Verify persistence
        const checkRes = await request(app)
            .get('/api/settings/theme')
            .set('Authorization', `Bearer ${authToken}`);
        expect(checkRes.body.theme).toBe('dark');
    });

    it('should reject invalid theme', async () => {
        await request(app)
            .put('/api/settings/theme')
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-CSRF-Token', csrfToken)
            .set('Cookie', [`csrf-token=${csrfToken}`])
            .send({ theme: 'invalid-theme' })
            .expect(400);
    });
});
