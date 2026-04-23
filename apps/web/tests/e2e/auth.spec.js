// web/tests/e2e/auth.spec.js
/**
 * Authentication E2E Tests
 * 
 * End-to-end tests for authentication flows using Playwright.
 * These tests run against a real browser and test the full stack.
 * 
 * Run with: npx playwright test
 */

import { test, expect } from '@playwright/test';

// Test user credentials (should match test database seed)
const TEST_USER = {
  username: 'e2e_test_user',
  password: 'TestPass123!'
};

test.describe('Authentication Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('/login');
  });

  test.describe('Login Page', () => {
    
    test('displays login form', async ({ page }) => {
      // Check for form elements
      await expect(page.getByLabel(/username/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
    });

    test('successful login redirects to dashboard', async ({ page }) => {
      // Fill in credentials
      await page.getByLabel(/username/i).fill(TEST_USER.username);
      await page.getByLabel(/password/i).fill(TEST_USER.password);
      
      // Click login
      await page.getByRole('button', { name: /login/i }).click();
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/');
      
      // Dashboard should be visible
      await expect(page.getByText(/dashboard/i)).toBeVisible();
    });

    test('invalid credentials show error', async ({ page }) => {
      // Fill in wrong credentials
      await page.getByLabel(/username/i).fill(TEST_USER.username);
      await page.getByLabel(/password/i).fill('wrongpassword');
      
      // Click login
      await page.getByRole('button', { name: /login/i }).click();
      
      // Should stay on login page
      await expect(page).toHaveURL('/login');
      
      // Error message should be visible
      await expect(page.getByText(/invalid/i)).toBeVisible();
    });

    test('empty fields show validation errors', async ({ page }) => {
      // Click login without filling fields
      await page.getByRole('button', { name: /login/i }).click();
      
      // Should show validation messages
      const usernameInput = page.getByLabel(/username/i);
      await expect(usernameInput).toHaveAttribute('required');
    });

    test('can toggle to registration form', async ({ page }) => {
      // Click create account link
      await page.getByText(/create account/i).click();
      
      // Button should change to Register
      await expect(page.getByRole('button', { name: /register/i })).toBeVisible();
    });
  });

  test.describe('Registration', () => {
    
    test.beforeEach(async ({ page }) => {
      // Switch to registration form
      await page.getByText(/create account/i).click();
    });

    test('successful registration and auto-login', async ({ page }) => {
      const uniqueUsername = `newuser_${Date.now()}`;
      
      // Fill registration form
      await page.getByLabel(/username/i).fill(uniqueUsername);
      await page.getByLabel(/password/i).fill('NewPass123!');
      
      // Submit
      await page.getByRole('button', { name: /register/i }).click();
      
      // Should redirect to dashboard after registration
      await expect(page).toHaveURL('/');
      await expect(page.getByText(/dashboard/i)).toBeVisible();
    });

    test('duplicate username shows error', async ({ page }) => {
      // Try to register with existing username
      await page.getByLabel(/username/i).fill(TEST_USER.username);
      await page.getByLabel(/password/i).fill('SomePass123!');
      
      await page.getByRole('button', { name: /register/i }).click();
      
      // Should show error
      await expect(page.getByText(/already exists|taken/i)).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    
    test('unauthenticated users are redirected to login', async ({ page }) => {
      // Try to access dashboard without logging in
      await page.goto('/');
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });

    test('unauthenticated users cannot access profile', async ({ page }) => {
      await page.goto('/profile');
      await expect(page).toHaveURL('/login');
    });

    test('unauthenticated users cannot access settings', async ({ page }) => {
      await page.goto('/settings');
      await expect(page).toHaveURL('/login');
    });

    test('authenticated users can access protected routes', async ({ page }) => {
      // Login first
      await page.getByLabel(/username/i).fill(TEST_USER.username);
      await page.getByLabel(/password/i).fill(TEST_USER.password);
      await page.getByRole('button', { name: /login/i }).click();
      
      // Wait for dashboard
      await expect(page).toHaveURL('/');
      
      // Navigate to profile
      await page.goto('/profile');
      await expect(page).toHaveURL('/profile');
      await expect(page.getByText(/profile/i)).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    
    test('logout redirects to login and clears session', async ({ page }) => {
      // Login first
      await page.getByLabel(/username/i).fill(TEST_USER.username);
      await page.getByLabel(/password/i).fill(TEST_USER.password);
      await page.getByRole('button', { name: /login/i }).click();
      
      await expect(page).toHaveURL('/');
      
      // Click logout (assuming there's a logout button in the header)
      await page.getByRole('button', { name: /logout/i }).click();
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
      
      // Try to access dashboard again
      await page.goto('/');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Session Persistence', () => {
    
    test('session persists after page reload', async ({ page }) => {
      // Login
      await page.getByLabel(/username/i).fill(TEST_USER.username);
      await page.getByLabel(/password/i).fill(TEST_USER.password);
      await page.getByRole('button', { name: /login/i }).click();
      
      await expect(page).toHaveURL('/');
      
      // Reload page
      await page.reload();
      
      // Should still be on dashboard (session persisted)
      await expect(page).toHaveURL('/');
      await expect(page.getByText(/dashboard/i)).toBeVisible();
    });
  });
});

test.describe('Rate Limiting', () => {
  
  test('blocks after too many failed attempts', async ({ page }) => {
    // Attempt login multiple times with wrong password
    for (let i = 0; i < 6; i++) {
      await page.goto('/login');
      await page.getByLabel(/username/i).fill('testuser');
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /login/i }).click();
      
      // Small delay between attempts
      if (i < 5) {
        await page.waitForTimeout(100);
      }
    }
    
    // Should show rate limit error on 6th attempt
    await expect(page.getByText(/too many|rate limit|try again later/i)).toBeVisible();
  });
});
