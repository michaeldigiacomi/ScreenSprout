/**
 * Notifications API Integration Tests
 */

// Set required environment variables before importing app
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test';

const request = require('supertest');
const { createApp } = require('../../app');
const { setupTestDatabase, teardownTestDatabase, getTestPool, clearTestData } = require('../setup');
const { testUsers, getValidCredentials } = require('../fixtures/users');

describe('Notifications API', () => {
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
                `INSERT INTO users (id, username, password_hash, created_at) VALUES ($1, $2, $3, $4)`,
                [user.id, user.username, user.password_hash, user.created_at]
            );
        }

        // Login
        const credentials = getValidCredentials('testparent');
        const loginRes = await request(app).post('/api/auth/login').send(credentials);
        authToken = loginRes.body.token;

        // Get CSRF
        const csrfRes = await request(app).get('/api/auth/csrf-token').set('Authorization', `Bearer ${authToken}`);
        csrfToken = csrfRes.body.csrfToken;

        // Seed Notifications
        await pool.query(
            `INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
             VALUES 
             ($1, $2, 'alert', 'Alert', 'Test Message 1', false, NOW()),
             ($3, $2, 'info', 'Info', 'Test Message 2', true, NOW())`,
            ['123e4567-e89b-12d3-a456-426614174001', 1002, '123e4567-e89b-12d3-a456-426614174002']
        );
    });

    it('should fetch notifications', async () => {
        const res = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(res.body).toHaveLength(2);
    });

    it('should fetch unread count', async () => {
        const res = await request(app)
            .get('/api/notifications/unread-count')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(res.body.count).toBe(1);
    });

    it('should mark all as read', async () => {
        await request(app)
            .put('/api/notifications/read-all')
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-CSRF-Token', csrfToken)
            .set('Cookie', [`csrf-token=${csrfToken}`])
            .expect(200);

        const res = await request(app)
            .get('/api/notifications/unread-count')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.body.count).toBe(0);
    });
});
