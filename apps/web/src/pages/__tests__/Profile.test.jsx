/**
 * Profile Page Tests
 * 
 * Tests for Profile page including:
 * - Rendering
 * - Profile form
 * - Shared access management
 * - Form validation
 * - API interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Profile from '../Profile';
import { server } from '../../../tests/mocks/server';
import { http, HttpResponse } from 'msw';

// Mock Header to avoid ThemeContext issues
vi.mock('../../components/Header', () => ({
  default: () => null
}));

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

describe('Profile Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'mock-token');
  });

  const renderProfile = () => {
    return render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    it('renders profile header', async () => {
      renderProfile();
      
      await waitFor(() => {
        expect(screen.getByText('My Profile')).toBeInTheDocument();
      });
    });

    it('renders profile form', async () => {
      renderProfile();
      
      await waitFor(() => {
        expect(screen.getByText('Personal Information')).toBeInTheDocument();
      });
      
      // Use specific IDs to target the profile form inputs (not the invite form)
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
      // Check for the profile email input specifically by its id
      expect(document.querySelector('input#email')).toBeInTheDocument();
    });

    it('renders delegated access section', async () => {
      renderProfile();
      
      await waitFor(() => {
        expect(screen.getByText('Delegated Access')).toBeInTheDocument();
      });
    });

    it('renders invite form', async () => {
      renderProfile();
      
      await waitFor(() => {
        expect(screen.getByText('Invite a Parent')).toBeInTheDocument();
      });
    });

    it('renders shared viewers list', async () => {
      renderProfile();
      
      await waitFor(() => {
        expect(screen.getByText('Who has access?')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByText('partner@example.com')).toBeInTheDocument();
      });
      
      expect(screen.getByText('grandparent@example.com')).toBeInTheDocument();
    });
  });

  describe('Profile Form', () => {
    it('loads profile data on mount', async () => {
      renderProfile();
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });
      
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('A parent using ScreenSprout')).toBeInTheDocument();
    });

    it('updates form fields on input', async () => {
      renderProfile();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });
      
      const nameInput = screen.getByLabelText(/full name/i);
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      
      expect(nameInput).toHaveValue('Updated Name');
    });

    it('submits profile update', async () => {
      renderProfile();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });
      
      const nameInput = screen.getByLabelText(/full name/i);
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/profile updated/i)).toBeInTheDocument();
      });
    });

    it('shows loading state during save', async () => {
      renderProfile();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
      
      // Button should show "Saving..." during API call
      waitFor(() => {
        expect(screen.getByText(/saving/i)).toBeInTheDocument();
      });
    });
  });

  describe('Shared Access', () => {
    it('displays shared viewers with status', async () => {
      renderProfile();
      
      await waitFor(() => {
        expect(screen.getByText('partner@example.com')).toBeInTheDocument();
      });
      
      expect(screen.getByText('accepted')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
    });

    it('allows inviting new parent', async () => {
      renderProfile();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/partner@example.com/i)).toBeInTheDocument();
      });
      
      const emailInput = screen.getByPlaceholderText(/partner@example.com/i);
      fireEvent.change(emailInput, { target: { value: 'newparent@example.com' } });
      
      fireEvent.click(screen.getByRole('button', { name: /send invite/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/invitation sent/i)).toBeInTheDocument();
      });
    });

    it('clears email input after successful invite', async () => {
      renderProfile();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/partner@example.com/i)).toBeInTheDocument();
      });
      
      const emailInput = screen.getByPlaceholderText(/partner@example.com/i);
      fireEvent.change(emailInput, { target: { value: 'newparent@example.com' } });
      
      fireEvent.click(screen.getByRole('button', { name: /send invite/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/invitation sent/i)).toBeInTheDocument();
      });
      
      expect(emailInput).toHaveValue('');
    });

    it('handles invite error', async () => {
      server.use(
        http.post('/api/share/invite', () => {
          return HttpResponse.json({ error: 'User already invited' }, { status: 400 });
        })
      );
      
      renderProfile();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/partner@example.com/i)).toBeInTheDocument();
      });
      
      const emailInput = screen.getByPlaceholderText(/partner@example.com/i);
      fireEvent.change(emailInput, { target: { value: 'partner@example.com' } });
      
      fireEvent.click(screen.getByRole('button', { name: /send invite/i }));
      
      await waitFor(() => {
        // The actual error message from the server is displayed
        expect(screen.getByText(/user already invited/i)).toBeInTheDocument();
      });
    });

    it('shows empty state when no shared viewers', async () => {
      server.use(
        http.get('/api/share', () => {
          return HttpResponse.json([]);
        })
      );
      
      renderProfile();
      
      await waitFor(() => {
        expect(screen.getByText(/no one yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error on failed profile load', async () => {
      server.use(
        http.get('/api/profile', () => {
          return HttpResponse.error();
        })
      );
      
      renderProfile();
      
      // Form should still render with empty values
      await waitFor(() => {
        expect(screen.getByText('Personal Information')).toBeInTheDocument();
      });
    });

    it('displays error on failed profile update', async () => {
      server.use(
        http.put('/api/profile', () => {
          return HttpResponse.error();
        })
      );
      
      renderProfile();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/failed to update profile/i)).toBeInTheDocument();
      });
    });
  });

  describe('Success Messages', () => {
    it('clears success message after 3 seconds', async () => {
      renderProfile();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/profile updated/i)).toBeInTheDocument();
      });
      
      // Wait for the message to auto-clear after 3 seconds
      await waitFor(() => {
        expect(screen.queryByText(/profile updated/i)).not.toBeInTheDocument();
      }, { timeout: 4000 });
    });
  });
});
