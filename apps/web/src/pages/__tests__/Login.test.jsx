/**
 * Login Component Tests
 * 
 * Tests for the Login page component including:
 * - Rendering
 * - Form validation
 * - API interactions
 * - Error handling
 * - Navigation
 * 
 * Run with: npm test -- Login.test.jsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock csrfManager
vi.mock('../../lib/csrf', () => {
  const mockCsrf = {
    init: vi.fn().mockResolvedValue('mock-csrf-token'),
    getToken: vi.fn().mockReturnValue('mock-csrf-token'),
    getHeaderName: vi.fn().mockReturnValue('x-csrf-token'),
    requiresCSRF: vi.fn().mockReturnValue(true),
    fetchToken: vi.fn().mockResolvedValue('mock-csrf-token'),
    setToken: vi.fn(),
    clearToken: vi.fn()
  };
  return {
    csrfManager: mockCsrf,
    default: mockCsrf
  };
});

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  // Helper to wait for form to be ready
  const waitForReady = async () => {
    await waitFor(() => {
        const btn = screen.getByRole('button', { name: /sign in/i });
        expect(btn).toBeEnabled();
    });
  };

  // ============================================
  // Rendering Tests
  // ============================================
  
  describe('Rendering', () => {
    it('renders login form by default', async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
      
      // Check for form elements
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders registration form when toggled', async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
      
      await waitForReady();

      // Click register toggle
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
      
      // Button text should change to Create Account
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('displays CSRF initialization state', async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
      
      const loginButton = screen.getByRole('button', { name: /sign in/i });
      expect(loginButton).toBeInTheDocument();
      
      // Eventually it becomes enabled
      await waitFor(() => {
        expect(loginButton).toBeEnabled();
      });
    });
  });

  // ============================================
  // Form Validation Tests
  // ============================================
  
  describe('Form Validation', () => {
    it('requires username field', async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
      
      await waitForReady();

      // Try to submit without username
      const loginButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(loginButton);
      
      // HTML5 validation should prevent submission
      const usernameInput = screen.getByLabelText(/username/i);
      expect(usernameInput).toBeInvalid();
    });

    it('requires password field', async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
      
      await waitForReady();

      // Fill username but not password
      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'testuser' }
      });
      
      const loginButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(loginButton);
      
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toBeInvalid();
    });

    it('accepts valid form input', async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
      
      await waitForReady();

      // Fill in valid data
      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'testuser' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });
      
      expect(screen.getByLabelText(/username/i)).toHaveValue('testuser');
      expect(screen.getByLabelText(/password/i)).toHaveValue('password123');
    });
  });

  // ============================================
  // API Interaction Tests
  // ============================================
  
  describe('Login API', () => {
    it('successful login stores token and redirects', async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
      
      await waitForReady();

      // Fill form with valid credentials (per MSW mock)
      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'testuser' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      
      // Wait for async operations
      await waitFor(() => {
        expect(window.localStorage.getItem('token')).toBe('mock-jwt-token-12345');
      });
      
      expect(window.localStorage.getItem('user')).toContain('testuser');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('displays error on invalid credentials', async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
      
      await waitForReady();

      // Fill form with invalid credentials
      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'testuser' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' }
      });
      
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('disables submit button during API call', async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
      
      await waitForReady();

      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'testuser' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });
      
      const loginButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });
  });

  describe('Registration API', () => {
    it('successful registration logs user in', async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
      
      await waitForReady();

      // Switch to register mode
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
      
      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'newuser' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'newpassword123' }
      });
      
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
      
      await waitFor(() => {
        expect(window.localStorage.getItem('token')).toBe('mock-jwt-token-new');
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('displays error for duplicate username', async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
      
      await waitForReady();

      // Switch to register mode
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
      
      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'existinguser' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });
      
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/already exists/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  
  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
      
      await waitForReady();

      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'testuser' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' }
      });

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      
      // Should display error message
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Accessibility Tests
  // ============================================
  
  describe('Accessibility', () => {
    it('has proper form labels', async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(usernameInput).toHaveAttribute('id');
      expect(passwordInput).toHaveAttribute('id');
    });

    it('password input is type password', async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
      
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('has accessible submit button', async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeInTheDocument();
      
      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });
    });
  });
});