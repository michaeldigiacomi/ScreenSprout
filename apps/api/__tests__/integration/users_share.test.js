/**
 * User Sharing API Integration Tests
 * 
 * Tests for sharing access to children/devices with other users
 */

// Set required environment variables before importing app
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test';

const request = require('supertest');
const { createApp } = require('../../app');
const { setupTestDatabase, teardownTestDatabase, getTestPool, clearTestData } = require('../setup');
const { testUsers, getValidCredentials } = require('../fixtures/users');

describe('User Sharing API', () => {
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
                `INSERT INTO users (id, username, password_hash, email, created_at) VALUES ($1, $2, $3, $4, $5)`,
                [user.id, user.username, user.password_hash, `user${user.id}@example.com`, user.created_at]
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

    it('should invite a user via email', async () => {
        const res = await request(app)
            .post('/api/share/invite')
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-CSRF-Token', csrfToken)
            .set('Cookie', [`csrf-token=${csrfToken}`])
            .send({ viewerEmail: 'other@example.com' })
            .expect(200);

        expect(res.body.viewer_email).toBe('other@example.com');
        expect(res.body.status).toBe('pending');
    });

    it('should list shared access', async () => {
        // Create a share record specifically for the test parent (user_id 1002)
        // Note: The logic in `src/routes/users.js` handles `owner_id`.
        // We need to ensure we insert with the correct owner_id.
        // testUsers[0] is testparent (1002).

        await pool.query(
            `INSERT INTO shared_access (owner_id, viewer_email, status) VALUES ($1, $2, $3)`,
            [1002, 'friend@example.com', 'accepted']
        );

        const res = await request(app)
            .get('/api/share')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(res.body).toHaveLength(1);
        expect(res.body[0].viewer_email).toBe('friend@example.com');
    });

    it('should revoke shared access', async () => {
        // 1. Create share
        const insertRes = await pool.query(
            `INSERT INTO shared_access (owner_id, viewer_email, status) VALUES ($1, $2, $3) RETURNING id`,
            [1002, 'revoke@example.com', 'pending']
        );
        const shareId = insertRes.rows[0].id;

        // 2. Revoke
        await request(app)
            .delete(`/api/share/${shareId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-CSRF-Token', csrfToken)
            .set('Cookie', [`csrf-token=${csrfToken}`])
            .expect(200);

        // 3. Verify gone
        const checkRes = await pool.query('SELECT * FROM shared_access WHERE id = $1', [shareId]);
        expect(checkRes.rows).toHaveLength(0);
    });
});
