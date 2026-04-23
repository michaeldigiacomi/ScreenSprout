const { getTestPool } = require('../__tests__/setup');

class Pool {
  constructor() {
    this.on = jest.fn();
    this.connect = jest.fn().mockResolvedValue({
      query: (text, params) => this.query(text, params),
      release: jest.fn()
    });
    this.end = jest.fn();
  }

  async query(text, params) {
    const pool = getTestPool();
    if (pool) {
      return pool.query(text, params);
    }
    console.warn('Test pool not initialized in pg mock');
    return { rows: [], rowCount: 0 };
  }
}

module.exports = { Pool };
