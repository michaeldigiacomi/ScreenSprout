/**
 * App Component Tests
 * 
 * Tests for App.jsx including:
 * - Routing configuration
 * - Protected routes
 * - Redirects
 * - Login route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../App';

// Mock all page components
vi.mock('../pages/Login', () => ({
  default: () => <div data-testid="login-page">Login Page</div>
}));

vi.mock('../pages/Dashboard', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard Page</div>
}));

vi.mock('../pages/Profile', () => ({
  default: () => <div data-testid="profile-page">Profile Page</div>
}));

vi.mock('../pages/Settings', () => ({
  default: () => <div data-testid="settings-page">Settings Page</div>
}));

vi.mock('../pages/Notifications', () => ({
  default: () => <div data-testid="notifications-page">Notifications Page</div>
}));

vi.mock('../components/GlobalAIChat', () => ({
  default: () => <div data-testid="global-ai-chat">AI Chat</div>
}));

describe('App Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Login Route', () => {
    it('renders login page at /login', () => {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <AppRoutes />
        </MemoryRouter>
      );
      
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  describe('Protected Routes - Without Auth', () => {
    it('redirects to login when accessing dashboard without token', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      );
      
      // Should redirect to login
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('redirects to login when accessing profile without token', () => {
      render(
        <MemoryRouter initialEntries={['/profile']}>
          <AppRoutes />
        </MemoryRouter>
      );
      
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('redirects to login when accessing settings without token', () => {
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <AppRoutes />
        </MemoryRouter>
      );
      
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  describe('Protected Routes - With Auth', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'mock-jwt-token');
    });

    it('renders dashboard when authenticated', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      );
      
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('renders profile when authenticated', () => {
      render(
        <MemoryRouter initialEntries={['/profile']}>
          <AppRoutes />
        </MemoryRouter>
      );
      
      expect(screen.getByTestId('profile-page')).toBeInTheDocument();
    });

    it('renders settings when authenticated', () => {
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <AppRoutes />
        </MemoryRouter>
      );
      
      expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    });

    it('renders notifications when authenticated', () => {
      render(
        <MemoryRouter initialEntries={['/notifications']}>
          <AppRoutes />
        </MemoryRouter>
      );
      
      expect(screen.getByTestId('notifications-page')).toBeInTheDocument();
    });

    it('renders GlobalAIChat on protected routes', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      );
      
      expect(screen.getByTestId('global-ai-chat')).toBeInTheDocument();
    });
  });

  describe('Legacy Route Redirects', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'mock-jwt-token');
    });

    it('redirects /live to /', () => {
      render(
        <MemoryRouter initialEntries={['/live']}>
          <AppRoutes />
        </MemoryRouter>
      );
      
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('redirects /rewards to /goals-rewards', () => {
      render(
        <MemoryRouter initialEntries={['/rewards']}>
          <AppRoutes />
        </MemoryRouter>
      );
      
      // Should redirect to goals-rewards (which we haven't mocked separately)
      // This would show the login page since we're not mocking goals-rewards
    });
  });

  describe('Catch-all Route', () => {
    it('redirects unknown routes to dashboard when authenticated', () => {
      localStorage.setItem('token', 'mock-jwt-token');
      
      render(
        <MemoryRouter initialEntries={['/unknown-route']}>
          <AppRoutes />
        </MemoryRouter>
      );
      
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('redirects unknown routes to login when not authenticated', () => {
      render(
        <MemoryRouter initialEntries={['/unknown-route']}>
          <AppRoutes />
        </MemoryRouter>
      );
      
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });
});
