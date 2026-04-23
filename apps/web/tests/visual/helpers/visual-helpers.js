/**
 * Visual Regression Test Helpers
 * 
 * Shared utilities for visual regression tests.
 */

/**
 * Login as a test user
 * @param {import('@playwright/test').Page} page
 * @param {{username: string, password: string}} credentials
 */
export async function loginAsTestUser(page, credentials) {
  // Clear any existing auth
  await page.evaluate(() => localStorage.clear());
  
  // Navigate to login
  await page.goto('/login');
  
  // Fill credentials
  await page.getByLabel(/username/i).fill(credentials.username);
  await page.getByLabel(/password/i).fill(credentials.password);
  
  // Click login
  await page.getByRole('button', { name: /login/i }).click();
  
  // Wait for navigation to dashboard
  await page.waitForURL('/', { timeout: 10000 });
  
  // Wait for page to be fully loaded
  await waitForPageReady(page);
}

/**
 * Wait for page to be ready for screenshot
 * - Waits for network to be idle
 * - Waits for animations to complete
 * - Hides elements that may cause flakiness (timestamps, etc.)
 * @param {import('@playwright/test').Page} page
 */
export async function waitForPageReady(page) {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');
  
  // Wait for any initial animations to complete
  await page.waitForTimeout(500);
  
  // Hide elements that may cause visual flakiness
  await hideFlakyElements(page);
}

/**
 * Hide elements that may cause visual flakiness in screenshots
 * - Timestamps
 * - Dynamic content
 * - Loading spinners
 * @param {import('@playwright/test').Page} page
 */
async function hideFlakyElements(page) {
  // Hide any loading indicators
  await page.addStyleTag({
    content: `
      /* Hide loading spinners and indicators */
      .loading, .spinner, [class*="loading"], [class*="spinner"],
      [class*="skeleton"], [class*="pulse"] {
        visibility: hidden !important;
      }
      
      /* Hide elements with timestamps or dynamic content */
      [data-testid="timestamp"], [data-testid="dynamic"],
      time, [datetime] {
        visibility: hidden !important;
      }
    `
  });
}

/**
 * Set viewport size for consistent screenshots
 * @param {import('@playwright/test').Page} page
 * @param {'desktop' | 'tablet' | 'mobile'} size
 */
export async function setViewportSize(page, size) {
  const viewports = {
    desktop: { width: 1280, height: 720 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 667 }
  };
  
  await page.setViewportSize(viewports[size]);
}

/**
 * Capture screenshot with consistent settings
 * @param {import('@playwright/test').Page} page
 * @param {string} name - Screenshot name (without extension)
 * @param {object} options - Additional screenshot options
 */
export async function captureScreenshot(page, name, options = {}) {
  const defaultOptions = {
    fullPage: true,
    animations: 'disabled'
  };
  
  return await page.screenshot({
    ...defaultOptions,
    ...options,
    path: `test-results/visual/${name}.png`
  });
}
