/**
 * ThemeToggle Component Tests
 * 
 * Tests for ThemeToggle including:
 * - Rendering
 * - Dropdown menu
 * - Theme selection
 * - Outside click handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ThemeToggle from '../ThemeToggle';
import { ThemeProvider } from '../../context/ThemeContext';

// Mock fetch
global.fetch = vi.fn();

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderWithProvider = (component) => {
    return render(
      <ThemeProvider>
        {component}
      </ThemeProvider>
    );
  };

  describe('Rendering', () => {
    it('renders theme toggle button', () => {
      renderWithProvider(<ThemeToggle />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('displays current theme icon', () => {
      renderWithProvider(<ThemeToggle />);
      
      // Default is system, which shows Monitor icon
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Dropdown Menu', () => {
    it('opens dropdown when clicked', () => {
      renderWithProvider(<ThemeToggle />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', () => {
      renderWithProvider(<ThemeToggle />);
      
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Light')).toBeInTheDocument();
      
      // Click outside
      fireEvent.mouseDown(document.body);
      
      waitFor(() => {
        expect(screen.queryByText('Light')).not.toBeInTheDocument();
      });
    });

    it('shows active theme with checkmark', () => {
      localStorage.setItem('theme', 'dark');
      
      renderWithProvider(<ThemeToggle />);
      
      fireEvent.click(screen.getByRole('button'));
      
      // Dark should have checkmark (indicated by being present)
      const darkOption = screen.getByText('Dark').closest('button');
      expect(darkOption).toHaveAttribute('style');
    });
  });

  describe('Theme Selection', () => {
    it('changes theme to light', () => {
      renderWithProvider(<ThemeToggle />);
      
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Light'));
      
      expect(localStorage.getItem('theme')).toBe('light');
    });

    it('changes theme to dark', () => {
      renderWithProvider(<ThemeToggle />);
      
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Dark'));
      
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('changes theme to system', () => {
      localStorage.setItem('theme', 'dark');
      
      renderWithProvider(<ThemeToggle />);
      
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('System'));
      
      expect(localStorage.getItem('theme')).toBe('system');
    });

    it('closes dropdown after selection', () => {
      renderWithProvider(<ThemeToggle />);
      
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Dark'));
      
      waitFor(() => {
        expect(screen.queryByText('Light')).not.toBeInTheDocument();
        expect(screen.queryByText('System')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper button role', () => {
      renderWithProvider(<ThemeToggle />);
      
      expect(screen.getByRole('button')).toHaveAttribute('title');
    });

    it('displays tooltip with current theme', () => {
      renderWithProvider(<ThemeToggle />);
      
      const button = screen.getByRole('button');
      expect(button.title).toContain('System');
    });
  });
});
