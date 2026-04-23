// web/playwright.config.js
/**
 * Playwright Configuration for E2E Tests
 * 
 * This configures Playwright for end-to-end browser testing.
 * Tests run against a real browser instance.
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:5173',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video recording
    video: 'on-first-retry',
    
    // Action timeout
    actionTimeout: 10000,
    
    // Navigation timeout
    navigationTimeout: 10000
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    }
  ],
  
  // Run local dev server before starting the tests
  webServer: {
    command: process.env.CI ? 'npm run preview' : 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
