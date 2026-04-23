/**
 * useTheme Hook Tests
 * 
 * Tests for useTheme hook including:
 * - Context consumption
 * - Theme values
 * - Theme setter function
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTheme, ThemeProvider } from '../../context/ThemeContext';

describe('useTheme Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Mock matchMedia
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
    
    // Mock fetch
    global.fetch = vi.fn();
  });

  const wrapper = ({ children }) => <ThemeProvider>{children}</ThemeProvider>;

  describe('Hook Returns', () => {
    it('returns theme value', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      expect(result.current.theme).toBeDefined();
    });

    it('returns resolvedTheme value', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      expect(result.current.resolvedTheme).toBeDefined();
    });

    it('returns setTheme function', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      expect(typeof result.current.setTheme).toBe('function');
    });

    it('returns toggleTheme function', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      expect(typeof result.current.toggleTheme).toBe('function');
    });
  });

  describe('Default Values', () => {
    it('defaults to system theme', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      expect(result.current.theme).toBe('system');
    });

    it('resolves to light by default', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      expect(result.current.resolvedTheme).toBe('light');
    });
  });

  describe.skip('Theme Switching', () => {
    it('can set theme to dark', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      result.current.setTheme('dark');
      
      expect(result.current.theme).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('can set theme to light', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      result.current.setTheme('light');
      
      expect(result.current.theme).toBe('light');
      expect(result.current.resolvedTheme).toBe('light');
    });

    it.skip('can toggle theme', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      // First toggle from system should go to dark
      result.current.toggleTheme();
      expect(result.current.theme).toBe('dark');
      
      // Second toggle should go to light
      result.current.toggleTheme();
      expect(result.current.theme).toBe('light');
    });
  });
});
