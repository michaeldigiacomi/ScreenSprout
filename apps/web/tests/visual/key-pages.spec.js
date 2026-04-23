/**
 * Visual Regression Tests - Key Pages
 * 
 * Tests that capture and compare screenshots of key pages against baselines.
 * Run `npm run test:visual:update` to update baselines after intentional changes.
 */

import { test, expect } from '@playwright/test';
import { loginAsTestUser, waitForPageReady } from './helpers/visual-helpers.js';

// Test user credentials (should match test database seed)
const TEST_USER = {
  username: 'e2e_test_user',
  password: 'TestPass123!'
};

test.describe('Visual Regression - Key Pages', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsTestUser(page, TEST_USER);
  });

  test.describe('Dashboard Page (/)', () => {
    
    test('dashboard visual appearance', async ({ page }) => {
      // Navigate to dashboard
      await page.goto('/');
      await waitForPageReady(page);
      
      // Take screenshot and compare with baseline
      // Baseline path: tests/visual/baseline/dashboard.png
      await expect(page).toHaveScreenshot('dashboard.png', {
        fullPage: true
      });
    });

    test('dashboard with add child form open', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);
      
      // Click "Add Child Profile" button
      await page.getByRole('button', { name: /add child profile/i }).click();
      
      // Wait for form to be visible
      await page.waitForSelector('form', { state: 'visible' });
      
      // Small delay for animation
      await page.waitForTimeout(300);
      
      await expect(page).toHaveScreenshot('dashboard-add-child.png', {
        fullPage: true
      });
    });
  });

  test.describe('Profile Page (/profile)', () => {
    
    test('profile page visual appearance', async ({ page }) => {
      await page.goto('/profile');
      await waitForPageReady(page);
      
      await expect(page).toHaveScreenshot('profile.png', {
        fullPage: true
      });
    });

    test('profile page with form filled', async ({ page }) => {
      await page.goto('/profile');
      await waitForPageReady(page);
      
      // Fill in the form
      await page.getByLabel(/full name/i).fill('Test Parent Name');
      await page.getByLabel(/email address/i).fill('testparent@example.com');
      await page.getByLabel(/bio/i).fill('This is a test bio for visual regression testing.');
      
      await expect(page).toHaveScreenshot('profile-filled.png', {
        fullPage: true
      });
    });
  });

  test.describe('Settings Page (/settings)', () => {
    
    test('settings page - account tab', async ({ page }) => {
      await page.goto('/settings');
      await waitForPageReady(page);
      
      // Account tab is default
      await expect(page).toHaveScreenshot('settings-account.png', {
        fullPage: true
      });
    });

    test('settings page - notifications tab', async ({ page }) => {
      await page.goto('/settings');
      await waitForPageReady(page);
      
      // Click on notifications tab
      await page.getByRole('button', { name: /notifications/i }).click();
      await page.waitForTimeout(200);
      
      await expect(page).toHaveScreenshot('settings-notifications.png', {
        fullPage: true
      });
    });

    test('settings page - policy tab', async ({ page }) => {
      await page.goto('/settings');
      await waitForPageReady(page);
      
      // Click on policy tab
      await page.getByRole('button', { name: /default policy/i }).click();
      await page.waitForTimeout(200);
      
      await expect(page).toHaveScreenshot('settings-policy.png', {
        fullPage: true
      });
    });

    test('settings page - preferences tab', async ({ page }) => {
      await page.goto('/settings');
      await waitForPageReady(page);
      
      // Click on preferences tab
      await page.getByRole('button', { name: /preferences/i }).click();
      await page.waitForTimeout(200);
      
      await expect(page).toHaveScreenshot('settings-preferences.png', {
        fullPage: true
      });
    });

    test('settings page - data tab', async ({ page }) => {
      await page.goto('/settings');
      await waitForPageReady(page);
      
      // Click on data tab
      await page.getByRole('button', { name: /data & privacy/i }).click();
      await page.waitForTimeout(200);
      
      await expect(page).toHaveScreenshot('settings-data.png', {
        fullPage: true
      });
    });
  });

  test.describe('Login Page (/login)', () => {
    
    test('login page visual appearance', async ({ page }) => {
      // Logout first
      await page.evaluate(() => localStorage.clear());
      
      await page.goto('/login');
      await waitForPageReady(page);
      
      await expect(page).toHaveScreenshot('login.png', {
        fullPage: true
      });
    });

    test('login page with error state', async ({ page }) => {
      await page.evaluate(() => localStorage.clear());
      
      await page.goto('/login');
      await waitForPageReady(page);
      
      // Fill wrong credentials
      await page.getByLabel(/username/i).fill('wronguser');
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /login/i }).click();
      
      // Wait for error to appear
      await page.waitForSelector('[class*="error"], [class*="alert"]', { state: 'visible' });
      await page.waitForTimeout(200);
      
      await expect(page).toHaveScreenshot('login-error.png', {
        fullPage: true
      });
    });
  });
});
