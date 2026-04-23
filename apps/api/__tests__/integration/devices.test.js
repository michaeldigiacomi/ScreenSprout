/**
 * Devices API Integration Tests
 * 
 * Tests for device management endpoints
 */

// Set required environment variables before importing app
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test';

const request = require('supertest');
const { createApp } = require('../../app');
const { setupTestDatabase, teardownTestDatabase, getTestPool, clearTestData } = require('../setup');
const { testUsers, getValidCredentials } = require('../fixtures/users');
const { testChildren, CHILD_IDS } = require('../fixtures/children');
const { testDevices, DEVICE_IDS } = require('../fixtures/devices');

describe('Devices API', () => {
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

    // Seed test devices
    for (const device of testDevices) {
      await pool.query(
        `INSERT INTO devices (id, user_id, child_id, device_name, device_type, last_seen, policy_json, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [device.id, device.user_id, device.child_id, device.device_name, device.device_type, device.last_seen, device.policy_json, device.created_at]
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

  describe('GET /api/devices', () => {
    it('should return all devices for authenticated user', async () => {
      const response = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect('Content-Type', /json/);

      // testparent (user_id: 2) has 3 devices
      expect(response.body).toHaveLength(3);
      expect(response.body[0]).toHaveProperty('device_name');
      expect(response.body[0]).toHaveProperty('device_type');
      expect(response.body[0]).toHaveProperty('child_name');
      expect(response.body[0]).toHaveProperty('used_seconds');
    });

    it('should include child_name for devices assigned to children', async () => {
      const response = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const deviceWithChild = response.body.find(d => d.child_id === CHILD_IDS.child1);
      expect(deviceWithChild).toBeDefined();
      expect(deviceWithChild.child_name).toBe('Test Child 1');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/devices')
        .expect(401);
    });
  });

  describe('POST /api/device/enroll', () => {
    it('should enroll a new device', async () => {
      const deviceData = {
        deviceId: '123e4567-e89b-12d3-a456-426614174000',
        deviceName: 'New Test Phone',
        deviceType: 'android'
      };

      const response = await request(app)
        .post('/api/device/enroll')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(deviceData)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.status).toBe('enrolled');
      expect(response.body.policy).toHaveProperty('dailyLimitMinutes');
    });

    it('should update existing device on re-enroll', async () => {
      // First enroll
      const deviceData = {
        deviceId: '123e4567-e89b-12d3-a456-426614174001',
        deviceName: 'Original Name',
        deviceType: 'ios'
      };

      await request(app)
        .post('/api/device/enroll')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(deviceData)
        .expect(200);

      // Re-enroll with new name
      const updatedData = {
        deviceId: '123e4567-e89b-12d3-a456-426614174001',
        deviceName: 'Updated Name',
        deviceType: 'ios'
      };

      const response = await request(app)
        .post('/api/device/enroll')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedData)
        .expect(200);

      expect(response.body.status).toBe('enrolled');

      // Verify in database
      const dbResult = await pool.query(
        'SELECT device_name FROM devices WHERE id = $1',
        [deviceData.deviceId]
      );
      expect(dbResult.rows[0].device_name).toBe('Updated Name');
    });

    it('should require authentication', async () => {
      const deviceData = {
        deviceId: 'test-device',
        deviceName: 'Test',
        deviceType: 'android'
      };

      await request(app)
        .post('/api/device/enroll')
        .send(deviceData)
        .expect(401);
    });
  });

  describe('PUT /api/devices/:deviceId', () => {
    it('should update device name', async () => {
      const updates = { deviceName: 'Updated Device Name' };

      const response = await request(app)
        .put(`/api/devices/${DEVICE_IDS.device1}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(updates)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.device_name).toBe(updates.deviceName);
    });

    it('should return 404 for non-existent device', async () => {
      const updates = { deviceName: 'Test' };

      await request(app)
        .put('/api/devices/123e4567-e89b-12d3-a456-426614174099')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(updates)
        .expect(404);
    });

    it('should return 404 for device belonging to another user', async () => {
      const updates = { deviceName: 'Hacked Name' };

      await request(app)
        .put(`/api/devices/${DEVICE_IDS.device4}`) // Belongs to testparent2
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(updates)
        .expect(404);
    });

    it('should require CSRF token', async () => {
      const updates = { deviceName: 'Test' };

      await request(app)
        .put(`/api/devices/${DEVICE_IDS.device1}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(403);
    });
  });

  describe('PUT /api/devices/:deviceId/assign', () => {
    it('should assign device to child', async () => {
      // Create a device without a child
      const deviceId = '123e4567-e89b-12d3-a456-426614174002';
      await pool.query(
        `INSERT INTO devices (id, user_id, device_name, device_type, last_seen)
         VALUES ($1, $2, $3, $4, NOW())`,
        [deviceId, 1002, 'Unassigned Device', 'android']
      );

      const response = await request(app)
        .put(`/api/devices/${deviceId}/assign`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send({ childId: CHILD_IDS.child1 })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.child_id).toBe(CHILD_IDS.child1);
    });

    it('should unassign device from child', async () => {
      const response = await request(app)
        .put(`/api/devices/${DEVICE_IDS.device1}/assign`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send({ childId: null })
        .expect(200);

      expect(response.body.child_id).toBeNull();
    });

    it('should return 404 for device belonging to another user', async () => {
      await request(app)
        .put(`/api/devices/${DEVICE_IDS.device4}/assign`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send({ childId: CHILD_IDS.child1 })
        .expect(404);
    });

    it('should return 404 for child belonging to another user', async () => {
      await request(app)
        .put(`/api/devices/${DEVICE_IDS.device1}/assign`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send({ childId: CHILD_IDS.child3 }) // Belongs to testparent2
        .expect(404);
    });
  });

  describe('GET /api/policy/:deviceId', () => {
    it('should return policy for owned device', async () => {
      const response = await request(app)
        .get(`/api/policy/${DEVICE_IDS.device1}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('dailyLimitMinutes');
    });

    it('should return empty object for device without policy', async () => {
      // Create device without policy
      const deviceId = '123e4567-e89b-12d3-a456-426614174003';
      await pool.query(
        `INSERT INTO devices (id, user_id, device_name, device_type, last_seen)
         VALUES ($1, $2, $3, $4, NOW())`,
        [deviceId, 1002, 'No Policy Device', 'android']
      );

      const response = await request(app)
        .get(`/api/policy/${deviceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({});
    });

    it('should return 404 for device belonging to another user', async () => {
      await request(app)
        .get(`/api/policy/${DEVICE_IDS.device4}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/policy/:deviceId', () => {
    it('should update device policy', async () => {
      const newPolicy = {
        dailyLimitMinutes: 180,
        blockedApps: ['BlockedApp1'],
        alwaysAllowedApps: ['AllowedApp1']
      };

      const response = await request(app)
        .put(`/api/policy/${DEVICE_IDS.device1}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(newPolicy)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.status).toBe('updated');
      expect(response.body.policy.dailyLimitMinutes).toBe(180);
    });

    it('should return 404 for device belonging to another user', async () => {
      const newPolicy = { dailyLimitMinutes: 100 };

      await request(app)
        .put(`/api/policy/${DEVICE_IDS.device4}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', [`csrf-token=${csrfToken}`])
        .send(newPolicy)
        .expect(404);
    });

    it('should require CSRF token', async () => {
      const newPolicy = { dailyLimitMinutes: 100 };

      await request(app)
        .put(`/api/policy/${DEVICE_IDS.device1}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newPolicy)
        .expect(403);
    });
  });

  describe('GET /api/stats/:deviceId', () => {
    it('should return stats for owned device', async () => {
      // Add some activity logs
      await pool.query(
        `INSERT INTO activity_logs (device_id, app_name, duration_seconds, timestamp)
         VALUES ($1, $2, $3, NOW())`,
        [DEVICE_IDS.device1, 'TestApp', 3600]
      );

      const response = await request(app)
        .get(`/api/stats/${DEVICE_IDS.device1}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('app_name');
      expect(response.body[0]).toHaveProperty('total_seconds');
    });

    it('should return empty array for device with no activity', async () => {
      const response = await request(app)
        .get(`/api/stats/${DEVICE_IDS.device2}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should return 404 for device belonging to another user', async () => {
      await request(app)
        .get(`/api/stats/${DEVICE_IDS.device4}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Data Isolation', () => {
    it('should not return devices from other users', async () => {
      const response = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should only see testparent's devices, not device4 (belongs to testparent2)
      const deviceIds = response.body.map(d => d.id);
      expect(deviceIds).toContain(DEVICE_IDS.device1);
      expect(deviceIds).toContain(DEVICE_IDS.device2);
      expect(deviceIds).toContain(DEVICE_IDS.device3);
      expect(deviceIds).not.toContain(DEVICE_IDS.device4);
    });
  });
});
