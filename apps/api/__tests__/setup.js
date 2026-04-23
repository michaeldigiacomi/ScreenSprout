/**
 * Test Setup and Utilities
 * 
 * This file configures the test environment and provides shared utilities
 * for all backend tests.
 */

const { newDb, DataType } = require('pg-mem');
const fs = require('fs');
const path = require('path');

// Track database instances for cleanup
let testDb = null;
let testPool = null;

/**
 * Create an in-memory PostgreSQL database for testing
 * Uses pg-mem for fast, isolated tests
 */
async function setupTestDatabase() {
  testDb = newDb();

  // Register common PostgreSQL functions
  testDb.public.registerFunction({
    name: 'now',
    returns: DataType.timestamp,
    implementation: () => new Date(),
  });

  testDb.public.registerFunction({
    name: 'current_timestamp',
    returns: DataType.timestamp,
    implementation: () => new Date(),
  });

  testDb.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    implementation: () => require('crypto').randomUUID(),
  });

  // Load the schema
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    let schema = fs.readFileSync(schemaPath, 'utf8');

    // Remove PL/PGSQL functions that are incompatible with pg-mem and cause splitting issues
    // The naive split(';') breaks function bodies that contain semicolons
    schema = schema.replace(/CREATE OR REPLACE FUNCTION[\s\S]*?LANGUAGE plpgsql;/g, '');

    // Split and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        testDb.public.query(statement);
      } catch (err) {
        // Some statements might fail (like CREATE INDEX CONCURRENTLY)
        // Log but continue
        if (!err.message.includes('CONCURRENTLY')) {
          // Silent for non-critical errors
        }
      }
    }
  }

  // Create a mock pool that uses pg-mem
  testPool = {
    query: async (sql, params) => {
      try {
        // Replace $1, $2, etc with actual values
        let modifiedSql = sql;
        if (params) {
          // Use single-pass regex replacement - the callback is called for each match
          // and the replacement value is NOT re-scanned for further matches.
          // This correctly handles bcrypt hashes containing $2b$10$... patterns.
          const paramMap = new Map();
          params.forEach((param, idx) => {
            paramMap.set(idx + 1, param);
          });

          modifiedSql = modifiedSql.replace(/\$(\d+)/g, (match, p1) => {
            const idx = parseInt(p1, 10);
            const param = paramMap.get(idx);

            if (!paramMap.has(idx)) {
              return match;
            }

            if (param === null || param === undefined) {
              return 'NULL';
            } else if (typeof param === 'string') {
              const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param);
              const escaped = param.replace(/'/g, "''");
              return isUUID ? `'${escaped}'::uuid` : `'${escaped}'`;
            } else if (param instanceof Date) {
              return `'${param.toISOString()}'`;
            } else if (typeof param === 'object' && Array.isArray(param)) {
              const elements = param.map(p => {
                if (typeof p === 'string') return `'${p.replace(/'/g, "''")}'`;
                return p;
              });
              return `ARRAY[${elements.join(',')}]`;
            } else if (typeof param === 'object') {
              return `'${JSON.stringify(param).replace(/'/g, "''")}'::jsonb`;
            } else {
              return String(param);
            }
          });
        }

        const result = testDb.public.query(modifiedSql);
        return {
          rows: result.rows || [],
          rowCount: result.rows ? result.rows.length : 0,
        };
      } catch (err) {
        // Map pg-mem errors to pg-style errors
        if (err.message.includes('unique constraint')) {
          const error = new Error('Unique constraint violation');
          error.code = '23505';
          throw error;
        }
        if (err.message.includes('foreign key')) {
          const error = new Error('Foreign key constraint violation');
          error.code = '23503';
          throw error;
        }
        throw err;
      }
    },
    connect: async () => ({
      query: async (sql, params) => testPool.query(sql, params),
      release: () => { },
    }),
    on: () => { }, // Event handler stub
    end: async () => { },
  };

  return { db: testDb, pool: testPool };
}

/**
 * Get the test database instance
 */
function getTestDb() {
  return testDb;
}

/**
 * Get the test pool instance
 */
function getTestPool() {
  return testPool;
}

/**
 * Clean up the test database
 */
async function teardownTestDatabase() {
  testDb = null;
  testPool = null;
}

/**
 * Seed the database with test data
 */
async function seedTestData() {
  const { testUsers } = require('./fixtures/users');

  for (const user of testUsers) {
    try {
      await testPool.query(
        `INSERT INTO users (id, username, password_hash, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [user.id, user.username, user.password_hash]
      );
    } catch {
      // User might already exist
    }
  }
}

/**
 * Clear all data from tables (but keep schema)
 */
async function clearTestData() {
  if (!testDb) return;

  const tables = [
    'activity_logs',
    'reward_redemptions',
    'points_transactions',
    'points_balance',
    'rewards',
    'goals',
    'goal_progress',
    'screen_time_summary',
    'schedules',
    'bonus_time_grants',
    'device_messages',
    'device_status',
    'geofence_events',
    'geofences',
    'location_history',
    'current_locations',
    'category_usage',
    'category_limits',
    'app_category_mappings',
    'app_categories',
    'web_history',
    'web_filter_rules',
    'web_filter_policies',
    'web_category_defaults',
    'notifications',
    'devices',
    'children',
    'shared_access',
    'users'
  ];

  for (const table of tables) {
    try {
      await testPool.query(`DELETE FROM ${table}`);
    } catch {
      // Table might not exist, ignore
    }
  }
}

/**
 * Create a test user and return auth token
 */
async function createTestUser(overrides = {}) {
  const bcrypt = require('bcrypt');

  const username = overrides.username || `testuser_${Date.now()}`;
  const password = overrides.password || 'TestPass123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await testPool.query(
    `INSERT INTO users (username, password_hash, created_at)
     VALUES ($1, $2, NOW()) RETURNING id, username`,
    [username, passwordHash]
  );

  const user = result.rows[0];

  // Generate JWT
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    user,
    token,
    password,
    username
  };
}

/**
 * Create a test child for a user
 */
async function createTestChild(userId, overrides = {}) {
  const { randomUUID } = require('crypto');

  const id = overrides.id || randomUUID();
  const name = overrides.name || `Test Child ${Date.now()}`;
  const dailyLimitMinutes = overrides.dailyLimitMinutes || 120;
  const blockedApps = JSON.stringify(overrides.blockedApps || []);
  const alwaysAllowedApps = JSON.stringify(overrides.alwaysAllowedApps || []);

  const result = await testPool.query(
    `INSERT INTO children (id, user_id, name, daily_limit_minutes, blocked_apps, always_allowed_apps, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
    [id, userId, name, dailyLimitMinutes, blockedApps, alwaysAllowedApps]
  );

  return result.rows[0];
}

/**
 * Create a test device for a user
 */
async function createTestDevice(userId, overrides = {}) {
  const { randomUUID } = require('crypto');

  const id = overrides.id || randomUUID();
  const deviceName = overrides.deviceName || `Test Device ${Date.now()}`;
  const deviceType = overrides.deviceType || 'android';
  const childId = overrides.childId || null;
  const policyJson = overrides.policyJson ? JSON.stringify(overrides.policyJson) : null;

  const result = await testPool.query(
    `INSERT INTO devices (id, user_id, child_id, device_name, device_type, policy_json, last_seen, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING *`,
    [id, userId, childId, deviceName, deviceType, policyJson]
  );

  return result.rows[0];
}

// Export utilities for use in tests
module.exports = {
  setupTestDatabase,
  teardownTestDatabase,
  getTestDb,
  getTestPool,
  seedTestData,
  clearTestData,
  createTestUser,
  createTestChild,
  createTestDevice
};
