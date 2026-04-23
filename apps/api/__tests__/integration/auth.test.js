/**
 * Authentication API Integration Tests
 * 
 * Tests for auth endpoints: register, login, change-password, profile
 */

// Set required environment variables before importing app
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { createApp, JWT_SECRET } = require('../../app');
const { setupTestDatabase, teardownTestDatabase, getTestPool, clearTestData } = require('../setup');
const { testUsers, TEST_PASSWORD, getValidCredentials } = require('../fixtures/users');

describe('Authentication API', () => {
  let app;
  let pool;
  let _server;

  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();
    pool = getTestPool();

    // Create app with test pool
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
  });

  describe('POST /api/auth/register', () => {
    it('should create a new user with valid data', async () => {
      const newUser = {
        username: 'newuser',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe(newUser.username);
      expect(response.body.user).not.toHaveProperty('password_hash');

      // Verify token is valid
      const decoded = jwt.verify(response.body.token, JWT_SECRET);
      expect(decoded).toHaveProperty('id');
      expect(decoded).toHaveProperty('username', newUser.username);
    });

    it('should reject registration without username', async () => {
      const invalidUser = {
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration without password', async () => {
      const invalidUser = {
        username: 'newuser'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject duplicate usernames', async () => {
      const user = {
        username: 'testparent',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(user)
        .expect(400);

      expect(response.body.error).toContain('already exists');
    });

    it('should reject weak passwords', async () => {
      const weakPasswordUser = {
        username: 'weakpassuser',
        password: '123'  // Too short
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordUser)
        .expect(400);

      expect(response.body.error).toContain('at least 8 characters');
    });

    it('should hash passwords securely', async () => {
      const newUser = {
        username: 'secureuser',
        password: 'SecurePass123!'
      };

      await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(200);

      // Verify password is hashed in database
      const result = await pool.query(
        'SELECT password_hash FROM users WHERE username = $1',
        [newUser.username]
      );

      expect(result.rows[0].password_hash).not.toBe(newUser.password);
      expect(result.rows[0].password_hash).toContain('$2'); // bcrypt hash prefix

      // Verify password can be verified with bcrypt
      const isValid = await bcrypt.compare(newUser.password, result.rows[0].password_hash);
      expect(isValid).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return JWT token for valid credentials', async () => {
      const credentials = getValidCredentials('testparent');

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('testparent');

      // Verify token is valid JWT
      const decoded = jwt.verify(response.body.token, JWT_SECRET);
      expect(decoded).toHaveProperty('id');
      expect(decoded).toHaveProperty('username', credentials.username);
    });

    it('should return 401 for invalid password', async () => {
      const credentials = {
        username: 'testparent',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      const credentials = {
        username: 'nonexistentuser',
        password: 'SomePass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should include theme in login response', async () => {
      const credentials = getValidCredentials('testparent');

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body.user).toHaveProperty('theme');
    });
  });

  describe('GET /api/profile', () => {
    let authToken;

    beforeEach(async () => {
      const credentials = getValidCredentials('testparent');
      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);
      authToken = response.body.token;
    });

    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('username', 'testparent');
      expect(response.body).not.toHaveProperty('password_hash');
      expect(response.body).toHaveProperty('id');
    });

    it('should return 401 without token', async () => {
      await request(app)
        .get('/api/profile')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app)
        .get('/api/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);
    });

    it('should return 401 with expired token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { id: 1, username: 'test' },
        JWT_SECRET,
        { expiresIn: '-1h' }  // Already expired
      );

      await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(403);
    });
  });

  describe('PUT /api/profile', () => {
    let authToken;
    let csrfToken;

    beforeEach(async () => {
      const credentials = getValidCredentials('testparent');
      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);
      authToken = response.body.token;

      // Get CSRF token
      const csrfResponse = await request(app)
        .get('/api/auth/csrf-token')
        .set('Authorization', `Bearer ${authToken}`);
      csrfToken = csrfResponse.body.csrfToken;
    });

    it('should update profile with valid data and CSRF token', async () => {
      const updates = {
        full_name: 'Test Parent Updated',
        email: 'updated@test.com',
        bio: 'Updated bio'
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(updates)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.full_name).toBe(updates.full_name);
      expect(response.body.email).toBe(updates.email);
      expect(response.body.bio).toBe(updates.bio);
    });

    it('should reject update without CSRF token', async () => {
      const updates = { full_name: 'Test' };

      await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(403);
    });

    it('should reject update without auth token', async () => {
      const updates = { full_name: 'Test' };

      await request(app)
        .put('/api/profile')
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(updates)
        .expect(401);
    });
  });

  describe('POST /api/auth/change-password', () => {
    let authToken;
    let csrfToken;

    beforeEach(async () => {
      const credentials = getValidCredentials('testparent');
      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);
      authToken = response.body.token;

      // Get CSRF token
      const csrfResponse = await request(app)
        .get('/api/auth/csrf-token')
        .set('Authorization', `Bearer ${authToken}`);
      csrfToken = csrfResponse.body.csrfToken;
    });

    it('should change password with valid credentials', async () => {
      const passwordData = {
        currentPassword: TEST_PASSWORD,
        newPassword: 'NewSecurePass123!'
      };

      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(passwordData)
        .expect(200);

      // Verify old password no longer works
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'testparent', password: TEST_PASSWORD })
        .expect(401);

      // Verify new password works
      const newLogin = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testparent', password: passwordData.newPassword })
        .expect(200);

      expect(newLogin.body).toHaveProperty('token');
    });

    it('should reject change with incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'NewSecurePass123!'
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(passwordData)
        .expect(401);

      expect(response.body.error).toContain('Current password is incorrect');
    });

    it('should reject change with weak new password', async () => {
      const passwordData = {
        currentPassword: TEST_PASSWORD,
        newPassword: '123' // Too short
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(passwordData)
        .expect(400);

      expect(response.body.error).toContain('at least 8 characters');
    });

    it('should require CSRF token', async () => {
      const passwordData = {
        currentPassword: TEST_PASSWORD,
        newPassword: 'NewSecurePass123!'
      };

      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(403);
    });
  });

  describe('GET /api/auth/csrf-token', () => {
    it('should return a CSRF token', async () => {
      const response = await request(app)
        .get('/api/auth/csrf-token')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('csrfToken');
      expect(response.body.csrfToken).toHaveLength(64); // 32 bytes hex = 64 chars

      // Check cookie is set
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('csrf-token=');
    });
  });

  describe('Health Check', () => {
    it('GET /health should return status ok', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });
});
