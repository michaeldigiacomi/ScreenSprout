/**
 * Settings Page Tests
 * 
 * Tests for Settings page including:
 * - Rendering
 * - Tab navigation
 * - Account settings (change password, delete account)
 * - Notification preferences
 * - Default policy settings
 * - Theme preferences
 * - Data export
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from '../Settings';
import { ThemeProvider } from '../../context/ThemeContext';
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

// Mock window.confirm and window.prompt
global.confirm = vi.fn();
global.prompt = vi.fn();

describe.skip('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'mock-token');
    global.confirm.mockReturnValue(false);
    global.prompt.mockReturnValue(null);
  });

  const renderSettings = () => {
    return render(
      <MemoryRouter>
        <ThemeProvider>
          <Settings />
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    it('renders settings header', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });

    it('renders all sidebar tabs', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Account')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Default Policy')).toBeInTheDocument();
      expect(screen.getByText('Preferences')).toBeInTheDocument();
      expect(screen.getByText('Data & Privacy')).toBeInTheDocument();
    });

    it('defaults to account tab', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Change Password')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('switches to notifications tab', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Notifications'));
      
      await waitFor(() => {
        expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
      });
    });

    it('switches to default policy tab', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Default Policy')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Default Policy'));
      
      await waitFor(() => {
        expect(screen.getByText('Default Screen Time Policy')).toBeInTheDocument();
      });
    });

    it('switches to preferences tab', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Preferences')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Preferences'));
      
      await waitFor(() => {
        expect(screen.getByText('Application Preferences')).toBeInTheDocument();
      });
    });

    it('switches to data tab', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Data & Privacy')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Data & Privacy'));
      
      await waitFor(() => {
        expect(screen.getByText('Export Your Data')).toBeInTheDocument();
      });
    });
  });

  describe('Account Settings - Change Password', () => {
    it('renders password change form', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Change Password')).toBeInTheDocument();
      });
      
      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    });

    it('validates password match', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });
      
      fireEvent.change(screen.getByLabelText(/current password/i), {
        target: { value: 'oldpass' }
      });
      fireEvent.change(screen.getByLabelText(/new password/i), {
        target: { value: 'newpass123' }
      });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), {
        target: { value: 'different' }
      });
      
      fireEvent.click(screen.getByRole('button', { name: /change password/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('validates minimum password length', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });
      
      fireEvent.change(screen.getByLabelText(/current password/i), {
        target: { value: 'oldpass' }
      });
      fireEvent.change(screen.getByLabelText(/new password/i), {
        target: { value: 'short' }
      });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), {
        target: { value: 'short' }
      });
      
      fireEvent.click(screen.getByRole('button', { name: /change password/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
      });
    });

    it('successfully changes password', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });
      
      fireEvent.change(screen.getByLabelText(/current password/i), {
        target: { value: 'oldpass' }
      });
      fireEvent.change(screen.getByLabelText(/new password/i), {
        target: { value: 'newpass123' }
      });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), {
        target: { value: 'newpass123' }
      });
      
      fireEvent.click(screen.getByRole('button', { name: /change password/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/password changed successfully/i)).toBeInTheDocument();
      });
    });

    it('clears password fields after successful change', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });
      
      fireEvent.change(screen.getByLabelText(/current password/i), {
        target: { value: 'oldpass' }
      });
      fireEvent.change(screen.getByLabelText(/new password/i), {
        target: { value: 'newpass123' }
      });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), {
        target: { value: 'newpass123' }
      });
      
      fireEvent.click(screen.getByRole('button', { name: /change password/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/password changed successfully/i)).toBeInTheDocument();
      });
      
      expect(screen.getByLabelText(/current password/i)).toHaveValue('');
      expect(screen.getByLabelText(/new password/i)).toHaveValue('');
      expect(screen.getByLabelText(/confirm new password/i)).toHaveValue('');
    });

    it('handles change password error', async () => {
      server.use(
        http.post('/api/auth/change-password', () => {
          return HttpResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
        })
      );
      
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });
      
      fireEvent.change(screen.getByLabelText(/current password/i), {
        target: { value: 'wrongpassword' }
      });
      fireEvent.change(screen.getByLabelText(/new password/i), {
        target: { value: 'newpass123' }
      });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), {
        target: { value: 'newpass123' }
      });
      
      fireEvent.click(screen.getByRole('button', { name: /change password/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument();
      });
    });
  });

  describe('Account Settings - Delete Account', () => {
    it('renders delete account section', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeInTheDocument();
      });
    });

    it('requires confirmation before delete', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeInTheDocument();
      });
      
      const deleteButton = screen.getByRole('button', { name: /delete my account/i });
      fireEvent.click(deleteButton);
      
      expect(global.confirm).toHaveBeenCalled();
    });

    it('requires typing DELETE for final confirmation', async () => {
      global.confirm.mockReturnValue(true);
      global.prompt.mockReturnValue('DELETE');
      
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeInTheDocument();
      });
      
      const deleteButton = screen.getByRole('button', { name: /delete my account/i });
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(global.prompt).toHaveBeenCalledWith('Type "DELETE" to confirm account deletion:');
      });
    });
  });

  describe('Notification Preferences', () => {
    it('loads saved notification preferences', async () => {
      localStorage.setItem('notification_prefs', JSON.stringify({
        emailNotifications: false,
        pushNotifications: true,
        timeLimitAlerts: false
      }));
      
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Notifications'));
      
      await waitFor(() => {
        expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
      });
    });

    it('toggles notification options', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Notifications'));
      
      await waitFor(() => {
        expect(screen.getByText('Email Notifications')).toBeInTheDocument();
      });
    });

    it('saves notification preferences', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Notifications'));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save preferences/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/notification preferences saved/i)).toBeInTheDocument();
      });
    });
  });

  describe('Default Policy Settings', () => {
    it('loads default policy from API', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Default Policy')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Default Policy'));
      
      await waitFor(() => {
        expect(screen.getByLabelText(/default daily limit/i)).toBeInTheDocument();
      });
    });

    it('updates default policy', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Default Policy')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Default Policy'));
      
      await waitFor(() => {
        expect(screen.getByLabelText(/default daily limit/i)).toBeInTheDocument();
      });
      
      const limitInput = screen.getByLabelText(/default daily limit/i);
      fireEvent.change(limitInput, { target: { value: '180' } });
      
      fireEvent.click(screen.getByRole('button', { name: /save default policy/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/default policy saved/i)).toBeInTheDocument();
      });
    });
  });

  describe('Theme Preferences', () => {
    it('renders theme selection buttons', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Preferences')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Preferences'));
      
      await waitFor(() => {
        expect(screen.getByText('Light')).toBeInTheDocument();
        expect(screen.getByText('Dark')).toBeInTheDocument();
        expect(screen.getByText('System')).toBeInTheDocument();
      });
    });

    it('switches theme to dark', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Preferences')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Preferences'));
      
      await waitFor(() => {
        expect(screen.getByText('Dark')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Dark'));
      
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('switches theme to light', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Preferences')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Preferences'));
      
      await waitFor(() => {
        expect(screen.getByText('Light')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Light'));
      
      expect(localStorage.getItem('theme')).toBe('light');
    });
  });

  describe('Data Export', () => {
    it('renders export data section', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Data & Privacy')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Data & Privacy'));
      
      await waitFor(() => {
        expect(screen.getByText('Export Your Data')).toBeInTheDocument();
      });
    });

    it('triggers data export', async () => {
      // Mock createElement and click for download
      const mockClick = vi.fn();
      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
        remove: vi.fn()
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
      
      // Mock URL methods - createObjectURL may not exist in test environment
      if (!window.URL.createObjectURL) {
        Object.defineProperty(window.URL, 'createObjectURL', {
          writable: true,
          value: vi.fn().mockReturnValue('blob:mock')
        });
      } else {
        vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:mock');
      }
      
      if (!window.URL.revokeObjectURL) {
        Object.defineProperty(window.URL, 'revokeObjectURL', {
          writable: true,
          value: vi.fn()
        });
      } else {
        vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
      }
      
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByText('Data & Privacy')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Data & Privacy'));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export all data/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /export all data/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/data exported successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Success and Error Messages', () => {
    it('displays error messages', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      });
      
      fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'a' } });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'b' } });
      
      fireEvent.click(screen.getByRole('button', { name: /change password/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('clears messages after 3 seconds', async () => {
      renderSettings();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });
      
      fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'old' } });
      fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'new123' } });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'new123' } });
      
      fireEvent.click(screen.getByRole('button', { name: /change password/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/password changed/i)).toBeInTheDocument();
      });
      
      // Wait for the message to auto-clear after 3 seconds
      await waitFor(() => {
        expect(screen.queryByText(/password changed/i)).not.toBeInTheDocument();
      }, { timeout: 4000 });
    });
  });
});
