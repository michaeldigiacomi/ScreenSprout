/**
 * Dashboard Component Tests
 * 
 * Tests for the Dashboard page component including:
 * - Rendering of children and devices
 * - Unassigned devices
 * - Interactions (Add child, Edit policy)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../Dashboard';

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock Header component to avoid ThemeContext issues
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

describe('Dashboard Component', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
    window.localStorage.clear();
    // Set auth token
    window.localStorage.setItem('token', 'mock-token');
  });

  it('renders dashboard header and children', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Header (look for h1)
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    
    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Bob')).toBeInTheDocument();
    
    // Check devices
    expect(screen.getByText("Alice's Tablet")).toBeInTheDocument();
    
    // Check usage stats
    expect(screen.getByText('45m / 120m')).toBeInTheDocument();
  });

  it('renders unassigned devices', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Unassigned Phone')).toBeInTheDocument();
    });
  });

  it('opens edit policy modal', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Find "Policy" button for the child card (child cards say "Policy", device cards say "Edit Policy")
    const policyButtons = screen.getAllByText('Policy');
    fireEvent.click(policyButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      expect(screen.getByDisplayValue('120')).toBeInTheDocument();
    });
  });
});
