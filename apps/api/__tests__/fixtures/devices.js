/**
 * Test Fixtures - Devices
 * 
 * Pre-defined test devices for consistent testing.
 */

const { randomUUID } = require('crypto');
const { CHILD_IDS } = require('./children');

// Fixed UUIDs for consistent testing
const DEVICE_IDS = {
  device1: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  device2: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  device3: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  device4: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
};

/**
 * Standard test devices
 */
const testDevices = [
  {
    id: DEVICE_IDS.device1,
    user_id: 1002, // Belongs to testparent
    child_id: CHILD_IDS.child1,
    device_name: 'Test Android Tablet',
    device_type: 'android',
    last_seen: new Date(),
    policy_json: JSON.stringify({ dailyLimitMinutes: 120 }),
    created_at: new Date('2024-01-01')
  },
  {
    id: DEVICE_IDS.device2,
    user_id: 1002, // Belongs to testparent
    child_id: CHILD_IDS.child1,
    device_name: 'Test iPad',
    device_type: 'ios',
    last_seen: new Date(),
    policy_json: JSON.stringify({ dailyLimitMinutes: 120 }),
    created_at: new Date('2024-01-10')
  },
  {
    id: DEVICE_IDS.device3,
    user_id: 1002, // Belongs to testparent
    child_id: CHILD_IDS.child2,
    device_name: 'Test Windows PC',
    device_type: 'windows',
    last_seen: new Date(),
    policy_json: JSON.stringify({ dailyLimitMinutes: 90 }),
    created_at: new Date('2024-01-20')
  },
  {
    id: DEVICE_IDS.device4,
    user_id: 1003, // Belongs to testparent2
    child_id: CHILD_IDS.child3,
    device_name: 'Other Parent Device',
    device_type: 'android',
    last_seen: new Date(),
    policy_json: JSON.stringify({ dailyLimitMinutes: 60 }),
    created_at: new Date('2024-02-01')
  }
];

/**
 * Factory function to create unique test devices
 */
let deviceCounter = 100;

function createDevice(overrides = {}) {
  deviceCounter++;
  return {
    id: randomUUID(),
    user_id: 1002,
    child_id: null,
    device_name: `Test Device ${deviceCounter}`,
    device_type: 'android',
    last_seen: new Date(),
    policy_json: JSON.stringify({ dailyLimitMinutes: 120 }),
    created_at: new Date(),
    ...overrides
  };
}

/**
 * Get devices for a specific user
 */
function getDevicesForUser(userId) {
  return testDevices.filter(device => device.user_id === userId);
}

/**
 * Get devices for a specific child
 */
function getDevicesForChild(childId) {
  return testDevices.filter(device => device.child_id === childId);
}

module.exports = {
  DEVICE_IDS,
  testDevices,
  createDevice,
  getDevicesForUser,
  getDevicesForChild
};
