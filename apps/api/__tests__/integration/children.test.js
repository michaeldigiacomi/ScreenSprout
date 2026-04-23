/**
 * Children API Integration Tests
 * 
 * Tests for children management endpoints
 */

// Set required environment variables before importing app
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test';

const request = require('supertest');
const { createApp } = require('../../app');
const { setupTestDatabase, teardownTestDatabase, getTestPool, clearTestData } = require('../setup');
const { testUsers, getValidCredentials } = require('../fixtures/users');
const { testChildren, CHILD_IDS } = require('../fixtures/children');

describe('Children API', () => {
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

    // Login and get tokens
    const credentials = getValidCredentials('testparent');
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send(credentials);
    authToken = loginResponse.body.token;

    // Get CSRF token
    const csrfResponse = await request(app)
      .get('/api/auth/csrf-token')
      .set('Authorization', `Bearer ${authToken}`);
    csrfToken = csrfResponse.body.csrfToken;
  });

  describe('GET /api/children', () => {
    it('should return all children for authenticated user', async () => {
      const response = await request(app)
        .get('/api/children')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect('Content-Type', /json/);

      // testparent (user_id: 2) has 2 children
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('daily_limit_minutes');
      expect(response.body[0]).toHaveProperty('devices');
      expect(response.body[0]).toHaveProperty('used_seconds');
    });

    it('should return empty array for user with no children', async () => {
      // Login as testadmin who has no children
      const credentials = getValidCredentials('testadmin');
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(credentials);
      const adminToken = loginResponse.body.token;

      const response = await request(app)
        .get('/api/children')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/children')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app)
        .get('/api/children')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);
    });
  });

  describe('POST /api/children', () => {
    it('should create a new child with valid data', async () => {
      const newChild = {
        name: 'New Test Child',
        dailyLimitMinutes: 180,
        blockedApps: ['TikTok', 'Snapchat']
      };

      const response = await request(app)
        .post('/api/children')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(newChild)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newChild.name);
      expect(response.body.daily_limit_minutes).toBe(newChild.dailyLimitMinutes);
      expect(response.body.user_id).toBe(1002); // testparent's ID
    });

    it('should create child with default values when optional fields omitted', async () => {
      const newChild = {
        name: 'Minimal Child'
      };

      const response = await request(app)
        .post('/api/children')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(newChild)
        .expect(200);

      expect(response.body.name).toBe(newChild.name);
      expect(response.body.daily_limit_minutes).toBe(120); // Default value
    });

    it('should require CSRF token', async () => {
      const newChild = { name: 'Test Child' };

      await request(app)
        .post('/api/children')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newChild)
        .expect(403);
    });

    it('should require authentication', async () => {
      const newChild = { name: 'Test Child' };

      await request(app)
        .post('/api/children')
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(newChild)
        .expect(401);
    });

    it('should store blocked_apps as JSON', async () => {
      const newChild = {
        name: 'JSON Test Child',
        blockedApps: ['App1', 'App2', 'App3']
      };

      const response = await request(app)
        .post('/api/children')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(newChild)
        .expect(200);

      // Verify in database
      const dbResult = await pool.query(
        'SELECT blocked_apps FROM children WHERE id = $1',
        [response.body.id]
      );

      let storedApps = dbResult.rows[0].blocked_apps;
      if (typeof storedApps === 'string') {
        storedApps = JSON.parse(storedApps);
      }
      expect(storedApps).toEqual(newChild.blockedApps);
    });
  });

  describe('PUT /api/children/:id', () => {
    it('should update child with valid data', async () => {
      const updates = {
        name: 'Updated Child Name',
        dailyLimitMinutes: 200,
        blockedApps: ['NewBlockedApp'],
        alwaysAllowedApps: ['AllowedApp']
      };

      const response = await request(app)
        .put(`/api/children/${CHILD_IDS.child1}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(updates)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.name).toBe(updates.name);
      expect(response.body.daily_limit_minutes).toBe(updates.dailyLimitMinutes);
    });

    it('should return 404 for non-existent child', async () => {
      const updates = { name: 'Test' };

      await request(app)
        .put('/api/children/123e4567-e89b-12d3-a456-426614174099')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(updates)
        .expect(404);
    });

    it('should return 404 for child belonging to another user', async () => {
      const updates = { name: 'Hacked Name' };

      await request(app)
        .put(`/api/children/${CHILD_IDS.child3}`) // Belongs to testparent2
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(updates)
        .expect(404);
    });

    it('should require CSRF token', async () => {
      const updates = { name: 'Test' };

      await request(app)
        .put(`/api/children/${CHILD_IDS.child1}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(403);
    });
  });

  describe('DELETE /api/children/:id', () => {
    it('should delete child with valid ID', async () => {
      await request(app)
        .delete(`/api/children/${CHILD_IDS.child1}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .expect(200);

      // Verify child is deleted
      const dbResult = await pool.query(
        'SELECT * FROM children WHERE id = $1',
        [CHILD_IDS.child1]
      );
      expect(dbResult.rows).toHaveLength(0);
    });

    it('should return 404 for non-existent child', async () => {
      await request(app)
        .delete('/api/children/123e4567-e89b-12d3-a456-426614174099')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .expect(404);
    });

    it('should return 404 for child belonging to another user', async () => {
      await request(app)
        .delete(`/api/children/${CHILD_IDS.child3}`) // Belongs to testparent2
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .expect(404);
    });

    it('should require CSRF token', async () => {
      await request(app)
        .delete(`/api/children/${CHILD_IDS.child1}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('should cascade delete related schedules', async () => {
      // Add a schedule for the child
      await pool.query(
        `INSERT INTO schedules (id, child_id, name, days_of_week, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CHILD_IDS.child1, 'Test Schedule', [1, 2, 3], '08:00', '17:00']
      );

      // Delete the child
      await request(app)
        .delete(`/api/children/${CHILD_IDS.child1}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .expect(200);

      // Verify schedule is also deleted
      const scheduleResult = await pool.query(
        'SELECT * FROM schedules WHERE child_id = $1',
        [CHILD_IDS.child1]
      );
      expect(scheduleResult.rows).toHaveLength(0);
    });
  });

  describe('GET /api/children - Data Isolation', () => {
    it('should not return children from other users', async () => {
      const response = await request(app)
        .get('/api/children')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should only see testparent's children (child1 and child2), not child3
      const childIds = response.body.map(c => c.id);
      expect(childIds).toContain(CHILD_IDS.child1);
      expect(childIds).toContain(CHILD_IDS.child2);
      expect(childIds).not.toContain(CHILD_IDS.child3);
    });
  });
});
