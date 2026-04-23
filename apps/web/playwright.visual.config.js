/**
 * Visual Regression Testing Configuration
 * 
 * This configures Playwright for visual regression testing.
 * Compares screenshots against baseline images to detect unintended UI changes.
 * 
 * Usage:
 *   npm run test:visual           - Run visual tests (compare against baseline)
 *   npm run test:visual:update    - Update baseline screenshots
 *   npm run test:visual:ci        - Run in CI mode (strict, fails on differences)
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/visual',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // No retries for visual tests (screenshots should match first time)
  retries: 0,
  
  // Single worker for consistent screenshots
  workers: 1,
  
  // Reporter to use
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    // Add junit reporter for CI integration
    process.env.CI ? ['junit', { outputFile: 'test-results/visual-junit.xml' }] : ['null']
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:5173',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Always take screenshots for visual comparison
    screenshot: 'on',
    
    // No video for visual tests (interferes with screenshots)
    video: 'off',
    
    // Action timeout
    actionTimeout: 10000,
    
    // Navigation timeout
    navigationTimeout: 10000,
    
    // Viewport size for consistent screenshots
    viewport: { width: 1280, height: 720 },
    
    // Ignore HTTPS errors (for local dev)
    ignoreHTTPSErrors: true
  },
  
  // Configure projects for visual testing
  // We only use Chromium for visual tests to ensure consistency
  projects: [
    {
      name: 'visual-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Force specific viewport for consistency
        viewport: { width: 1280, height: 720 }
      }
    }
  ],
  
  // Snapshot configuration for visual testing
  snapshotDir: './tests/visual/baseline',
  snapshotPathTemplate: '{snapshotDir}/{arg}{ext}',
  expect: {
    // Maximum time expect() should wait for the condition to be met
    timeout: 10000,
    
    // Visual comparison options
    toHaveScreenshot: {
      // Maximum acceptable pixel difference ratio (0.2 = 0.2%)
      maxDiffPixelRatio: 0.02,
      // Maximum acceptable pixel difference count
      maxDiffPixels: 100,
      // Threshold for considering pixels different (0-1)
      threshold: 0.2,
      // Animate screenshots (wait for animations to finish)
      animations: 'disabled'
    }
  },
  
  // Run local dev server before starting the tests
  webServer: {
    command: process.env.CI ? 'npm run preview' : 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
