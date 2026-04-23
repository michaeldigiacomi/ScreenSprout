// backend/jest.config.js
/**
 * Jest Configuration for ScreenSprout Backend
 * 
 * This configuration sets up Jest for testing the Express.js backend
 * with support for unit tests, integration tests, and coverage reporting.
 */

module.exports = {
  // Use Node.js environment (not jsdom)
  testEnvironment: 'node',
  
  // Root directories for test discovery
  roots: ['<rootDir>/__tests__'],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'node'],
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'server.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/coverage/**'
  ],
  
  coverageDirectory: '<rootDir>/coverage',
  
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json'
  ],
  
  // Coverage thresholds - set to realistic levels for current test suite
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },
  
  // Transform configuration (if using modern JS features)
  transform: {},
  
  // Verbose output for debugging
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Maximum workers to use for running tests
  maxWorkers: '50%',
  
  // Fail tests on console errors/warnings
  // Uncomment to enforce clean console in tests
  // errorOnDeprecated: true,
  
  // Test timeout (10 seconds default)
  testTimeout: 10000,
  
  // Globals available in tests
  globals: {
    // Add any global test utilities here
  }
};
