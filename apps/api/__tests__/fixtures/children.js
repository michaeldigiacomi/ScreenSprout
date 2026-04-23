/**
 * Test Fixtures - Children
 * 
 * Pre-defined test children for consistent testing.
 */

const { randomUUID } = require('crypto');

// Fixed UUIDs for consistent testing
const CHILD_IDS = {
  child1: '11111111-1111-1111-1111-111111111111',
  child2: '22222222-2222-2222-2222-222222222222',
  child3: '33333333-3333-3333-3333-333333333333',
};

/**
 * Standard test children
 */
const testChildren = [
  {
    id: CHILD_IDS.child1,
    user_id: 1002, // Belongs to testparent
    name: 'Test Child 1',
    daily_limit_minutes: 120,
    blocked_apps: JSON.stringify(['Minecraft', 'Fortnite']),
    always_allowed_apps: JSON.stringify(['Calculator', 'Duolingo']),
    created_at: new Date('2024-01-01')
  },
  {
    id: CHILD_IDS.child2,
    user_id: 1002, // Belongs to testparent
    name: 'Test Child 2',
    daily_limit_minutes: 90,
    blocked_apps: JSON.stringify(['Roblox']),
    always_allowed_apps: JSON.stringify(['Khan Academy']),
    created_at: new Date('2024-01-15')
  },
  {
    id: CHILD_IDS.child3,
    user_id: 1003, // Belongs to testparent2
    name: 'Other Parent Child',
    daily_limit_minutes: 60,
    blocked_apps: JSON.stringify([]),
    always_allowed_apps: JSON.stringify([]),
    created_at: new Date('2024-02-01')
  }
];

/**
 * Factory function to create unique test children
 */
let childCounter = 100;

function createChild(overrides = {}) {
  childCounter++;
  return {
    id: randomUUID(),
    user_id: 1002,
    name: `Test Child ${childCounter}`,
    daily_limit_minutes: 120,
    blocked_apps: JSON.stringify([]),
    always_allowed_apps: JSON.stringify([]),
    created_at: new Date(),
    ...overrides
  };
}

/**
 * Get children for a specific user
 */
function getChildrenForUser(userId) {
  return testChildren.filter(child => child.user_id === userId);
}

module.exports = {
  CHILD_IDS,
  testChildren,
  createChild,
  getChildrenForUser
};
