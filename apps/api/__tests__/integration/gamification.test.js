/**
 * Gamification API Integration Tests
 *
 * Tests for Goals, Rewards, and Points
 */

// Set required environment variables before importing app
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test';

const request = require('supertest');
const { createApp } = require('../../app');
const { setupTestDatabase, teardownTestDatabase, getTestPool, clearTestData } = require('../setup');
const { testUsers, getValidCredentials } = require('../fixtures/users');
const { testChildren, CHILD_IDS } = require('../fixtures/children');

describe('Gamification API', () => {
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

        // Seed Children
        for (const child of testChildren) {
            await pool.query(
                `INSERT INTO children (id, user_id, name, daily_limit_minutes, blocked_apps, always_allowed_apps, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [child.id, child.user_id, child.name, child.daily_limit_minutes, child.blocked_apps, child.always_allowed_apps, child.created_at]
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

    describe('Goals', () => {
        it('should create a new goal', async () => {
            const newGoal = {
                childId: CHILD_IDS.child1,
                name: 'Stay under 2 hours',
                goalType: 'daily_limit',
                targetValue: 120,
                pointsReward: 50
            };

            const res = await request(app)
                .post('/api/goals')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-CSRF-Token', csrfToken)
                .set('Cookie', [`csrf-token=${csrfToken}`])
                .send(newGoal)
                .expect(201);

            expect(res.body.name).toBe(newGoal.name);
            expect(res.body.points_reward).toBe(50);
        });

        it('should get goals for a child', async () => {
            // Create a goal first via the API
            await request(app)
                .post('/api/goals')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-CSRF-Token', csrfToken)
                .set('Cookie', [`csrf-token=${csrfToken}`])
                .send({
                    childId: CHILD_IDS.child1,
                    name: 'Test Goal',
                    goalType: 'daily_limit',
                    targetValue: 60,
                    pointsReward: 10
                })
                .expect(201);

            const res = await request(app)
                .get(`/api/goals?childId=${CHILD_IDS.child1}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body).toHaveLength(1);
            expect(res.body[0].name).toBe('Test Goal');
        });

        it('should require childId query parameter', async () => {
            await request(app)
                .get('/api/goals')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);
        });
    });

    describe('Rewards', () => {
        it('should create a reward', async () => {
            const newReward = {
                childId: CHILD_IDS.child1,
                name: 'Ice Cream',
                pointsCost: 100
            };

            const res = await request(app)
                .post('/api/rewards')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-CSRF-Token', csrfToken)
                .set('Cookie', [`csrf-token=${csrfToken}`])
                .send(newReward)
                .expect(201);

            expect(res.body.name).toBe('Ice Cream');
            expect(res.body.points_cost).toBe(100);
        });

        it('should get rewards for a child', async () => {
            // Create a reward first
            await request(app)
                .post('/api/rewards')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-CSRF-Token', csrfToken)
                .set('Cookie', [`csrf-token=${csrfToken}`])
                .send({
                    childId: CHILD_IDS.child1,
                    name: 'Movie Night',
                    pointsCost: 75
                })
                .expect(201);

            const res = await request(app)
                .get(`/api/rewards?childId=${CHILD_IDS.child1}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body).toHaveLength(1);
            expect(res.body[0].name).toBe('Movie Night');
        });
    });

    describe('Points', () => {
        it('should get points balance (auto-create if not exists)', async () => {
            const res = await request(app)
                .get(`/api/points?childId=${CHILD_IDS.child1}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body.balance).toBeDefined();
            expect(res.body.balance.current_balance).toBe(0);
            expect(res.body.transactions).toEqual([]);
        });

        it('should require childId query parameter', async () => {
            await request(app)
                .get('/api/points')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);
        });
    });
});
