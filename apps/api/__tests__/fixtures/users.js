// backend/__tests__/fixtures/users.js
/**
 * Test User Fixtures
 * 
 * Pre-defined test users for consistent testing.
 * Passwords are pre-hashed for testing efficiency.
 */

const bcrypt = require('bcrypt');

// Pre-hashed passwords (bcrypt with 10 rounds)
const TEST_PASSWORD = 'TestPass123!';
const TEST_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);

/**
 * Standard test users available for all tests
 */
const testUsers = [
  {
    id: 1001,
    username: 'testadmin',
    password_hash: TEST_PASSWORD_HASH,
    role: 'admin',
    email: 'admin@test.com',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: 1002,
    username: 'testparent',
    password_hash: TEST_PASSWORD_HASH,
    role: 'parent',
    email: 'parent@test.com',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: 1003,
    username: 'testparent2',
    password_hash: TEST_PASSWORD_HASH,
    role: 'parent',
    email: 'parent2@test.com',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  }
];

/**
 * Factory function to create unique test users
 * Automatically increments IDs to avoid conflicts
 */
let userIdCounter = 2000;

function createUser(overrides = {}) {
  userIdCounter++;
  return {
    id: userIdCounter,
    username: `testuser_${userIdCounter}`,
    password: TEST_PASSWORD,
    password_hash: bcrypt.hashSync(TEST_PASSWORD, 10),
    role: 'parent',
    email: `test${userIdCounter}@example.com`,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
}

/**
 * Get a valid user credential pair for login tests
 */
function getValidCredentials(username = 'testparent') {
  return {
    username,
    password: TEST_PASSWORD
  };
}

/**
 * Get an invalid credential pair
 */
function getInvalidCredentials() {
  return {
    username: 'nonexistent',
    password: 'wrongpassword'
  };
}

module.exports = {
  testUsers,
  createUser,
  getValidCredentials,
  getInvalidCredentials,
  TEST_PASSWORD,
  TEST_PASSWORD_HASH
};
