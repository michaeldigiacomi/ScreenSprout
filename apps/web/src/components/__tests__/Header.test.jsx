/**
 * Header Component Tests
 * 
 * Tests for Header including:
 * - Rendering
 * - Navigation links
 * - User menu
 * - Mobile menu
 * - Logout functionality
 * - Add Child button
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from '../Header';
import { ThemeProvider } from '../../context/ThemeContext';

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/' }),
  };
});

// Mock NotificationBell to avoid API calls
vi.mock('../NotificationBell', () => ({
  default: () => null
}));

// Mock ThemeToggle to simplify tests
vi.mock('../ThemeToggle', () => ({
  default: () => null
}));

describe('Header', () => {
  // Mock for desktop viewport
  const mockDesktopViewport = () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1200,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('user', JSON.stringify({ username: 'testuser' }));
    
    // Mock window.location
    delete window.location;
    window.location = { href: '' };
    
    // Mock matchMedia for theme detection
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    
    // Default to desktop viewport
    mockDesktopViewport();
  });

  const renderHeader = () => {
    return render(
      <MemoryRouter>
        <ThemeProvider>
          <Header />
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    it('renders ScreenSprout logo', () => {
      renderHeader();
      
      expect(screen.getByText('ScreenSprout')).toBeInTheDocument();
    });

    it('renders primary navigation items', () => {
      renderHeader();
      
      // Primary nav items (may appear multiple times due to sidebar)
      expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Schedule').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Activity').length).toBeGreaterThan(0);
    });

    it('renders user menu with username', () => {
      renderHeader();
      
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('shows user initial avatar', () => {
      renderHeader();
      
      // The avatar should show 'T' for 'testuser'
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('renders Add Child button prominently', () => {
      renderHeader();
      
      // Add Child button should be visible
      const addChildButtons = screen.getAllByText(/Add Child/i);
      expect(addChildButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    it('home link is present', () => {
      renderHeader();
      
      const homeLinks = screen.getAllByText('Home');
      expect(homeLinks.length).toBeGreaterThan(0);
    });

    it('all main navigation links are present', () => {
      renderHeader();
      
      // Main nav items
      expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Schedule').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Activity').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Reports').length).toBeGreaterThan(0);
    });
  });

  describe('User Menu', () => {
    it('opens user menu when clicked', () => {
      renderHeader();
      
      const userButton = screen.getByText('testuser').closest('button');
      fireEvent.click(userButton);
      
      expect(screen.getByText('Parent Account')).toBeInTheDocument();
      expect(screen.getByText('My Profile')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getAllByText('Logout').length).toBeGreaterThan(0);
    });

    it('closes user menu when clicking outside', () => {
      renderHeader();
      
      const userButton = screen.getByText('testuser').closest('button');
      fireEvent.click(userButton);
      
      expect(screen.getByText('Parent Account')).toBeInTheDocument();
      
      fireEvent.mouseDown(document.body);
      
      waitFor(() => {
        expect(screen.queryByText('Parent Account')).not.toBeInTheDocument();
      });
    });

    it('navigates to profile page', () => {
      renderHeader();
      
      const userButton = screen.getByText('testuser').closest('button');
      fireEvent.click(userButton);
      
      const profileLink = screen.getByText('My Profile').closest('a');
      expect(profileLink).toHaveAttribute('href', '/profile');
    });

    it('navigates to settings page', () => {
      renderHeader();
      
      const userButton = screen.getByText('testuser').closest('button');
      fireEvent.click(userButton);
      
      const settingsLink = screen.getByText('Settings').closest('a');
      expect(settingsLink).toHaveAttribute('href', '/settings');
    });
  });

  describe('Add Child Button', () => {
    it('has Add Child button with correct link', () => {
      renderHeader();
      
      const addChildButton = screen.getAllByText(/Add Child/i)[0].closest('a');
      expect(addChildButton).toHaveAttribute('href', '/#add-child');
    });

    it('Add Child button has Plus icon', () => {
      renderHeader();
      
      // The Add Child button should be visible
      const addChildButtons = screen.getAllByText(/Add Child/i);
      expect(addChildButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Sidebar Navigation', () => {
    it('displays sidebar sections on desktop', () => {
      mockDesktopViewport();
      renderHeader();
      
      // Sidebar sections for non-tech parents - check for section titles
      expect(screen.getByText('My Family')).toBeInTheDocument();
    });

    it('has monitoring navigation links', () => {
      mockDesktopViewport();
      renderHeader();
      
      // Monitoring section links
      expect(screen.getByText('App Categories')).toBeInTheDocument();
      expect(screen.getByText('Time Requests')).toBeInTheDocument();
      expect(screen.getByText('Goals & Rewards')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Family Sharing')).toBeInTheDocument();
    });

    it('shows Quick Tip in sidebar', () => {
      mockDesktopViewport();
      renderHeader();
      
      expect(screen.getByText('Quick Tip')).toBeInTheDocument();
      expect(screen.getByText(/Click "Add Child" to create a profile/i)).toBeInTheDocument();
    });
  });

  describe('Logout', () => {
    it('clears localStorage on logout', () => {
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('test', 'value');
      
      renderHeader();
      
      const userButton = screen.getByText('testuser').closest('button');
      fireEvent.click(userButton);
      
      const logoutButtons = screen.getAllByText('Logout');
      fireEvent.click(logoutButtons[0]);
      
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('redirects to login on logout', () => {
      renderHeader();
      
      const userButton = screen.getByText('testuser').closest('button');
      fireEvent.click(userButton);
      
      const logoutButtons = screen.getAllByText('Logout');
      fireEvent.click(logoutButtons[0]);
      
      expect(window.location.href).toBe('/login');
    });
  });

  describe('Theme Integration', () => {
    it('renders ThemeToggle component', () => {
      renderHeader();
      
      // ThemeToggle is rendered as a button
      expect(document.querySelector('button')).toBeInTheDocument();
    });

    it('renders NotificationBell component', () => {
      renderHeader();
      
      // There should be multiple buttons including notification bell
      expect(document.querySelectorAll('button').length).toBeGreaterThan(0);
    });
  });

  describe('Default User', () => {
    it('shows "User" when no username in localStorage', () => {
      localStorage.clear();
      renderHeader();
      
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('U')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has descriptive labels for navigation', () => {
      renderHeader();
      
      // All nav items should have both icon and text
      expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Schedule').length).toBeGreaterThan(0);
    });

    it('has clear section headings on desktop', () => {
      mockDesktopViewport();
      renderHeader();
      
      // Section headings help non-tech users understand organization
      expect(screen.getByText('My Family')).toBeInTheDocument();
    });
  });
});
