/**
 * CSRF Manager Tests
 * 
 * Tests for csrf.js including:
 * - Token storage and retrieval
 * - Token fetching
 * - Token clearing
 * - CSRF requirement checking
 * - Initialization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { csrfManager } from '../csrf';

describe('CSRF Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Reset the singleton instance
    csrfManager.token = null;
    
    // Mock fetch
    global.fetch = vi.fn();
  });

  describe('Token Storage', () => {
    it('stores token in memory', () => {
      csrfManager.setToken('test-token');
      expect(csrfManager.getToken()).toBe('test-token');
    });

    it('stores token in localStorage', () => {
      csrfManager.setToken('test-token');
      expect(localStorage.getItem('csrfToken')).toBe('test-token');
    });

    it('retrieves token from memory', () => {
      csrfManager.setToken('memory-token');
      const token = csrfManager.getToken();
      expect(token).toBe('memory-token');
    });

    it('retrieves token from localStorage when not in memory', () => {
      localStorage.setItem('csrfToken', 'storage-token');
      // csrfManager.token = null; // No-op
      
      const token = csrfManager.getToken();
      expect(token).toBe('storage-token');
    });

    it('returns null when no token exists', () => {
      csrfManager.token = null;
      localStorage.removeItem('csrfToken');
      
      const token = csrfManager.getToken();
      expect(token).toBeNull();
    });
  });

  describe('Token Clearing', () => {
    it('clears token from memory', () => {
      csrfManager.setToken('test-token');
      csrfManager.clearToken();
      
      expect(csrfManager.getToken()).toBeNull();
    });

    it('clears token from localStorage', () => {
      csrfManager.setToken('test-token');
      csrfManager.clearToken();
      
      expect(localStorage.getItem('csrfToken')).toBeNull();
    });
  });

  describe('Token Fetching', () => {
    it('fetches token from server', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'fetched-token' })
      });
      
      const token = await csrfManager.fetchToken();
      
      expect(token).toBe('fetched-token');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/csrf-token',
        expect.objectContaining({
          method: 'GET',
          headers: { 
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          credentials: 'include',
          cache: 'no-store'
        })
      );
    });

    it('stores fetched token', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'stored-token' })
      });
      
      await csrfManager.fetchToken();
      
      expect(csrfManager.getToken()).toBe('stored-token');
    });

    it('throws error on failed fetch', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });
      
      await expect(csrfManager.fetchToken()).rejects.toThrow('Failed to fetch CSRF token: 500');
    });

    it('throws error when token not in response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ otherField: 'value' })
      });
      
      await expect(csrfManager.fetchToken()).rejects.toThrow('CSRF token not found in response');
    });

    it('handles network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(csrfManager.fetchToken()).rejects.toThrow('Network error');
    });
  });

  describe('CSRF Requirement Checking', () => {
    it('requires CSRF for POST', () => {
      expect(csrfManager.requiresCSRF('POST')).toBe(true);
    });

    it('requires CSRF for PUT', () => {
      expect(csrfManager.requiresCSRF('PUT')).toBe(true);
    });

    it('requires CSRF for DELETE', () => {
      expect(csrfManager.requiresCSRF('DELETE')).toBe(true);
    });

    it('requires CSRF for PATCH', () => {
      expect(csrfManager.requiresCSRF('PATCH')).toBe(true);
    });

    it('does not require CSRF for GET', () => {
      expect(csrfManager.requiresCSRF('GET')).toBe(false);
    });

    it('handles lowercase methods', () => {
      expect(csrfManager.requiresCSRF('post')).toBe(true);
      expect(csrfManager.requiresCSRF('get')).toBe(false);
    });

    it('returns false for unknown methods', () => {
      expect(csrfManager.requiresCSRF('UNKNOWN')).toBe(false);
    });
  });

  describe('Header Name', () => {
    it('returns correct header name', () => {
      expect(csrfManager.getHeaderName()).toBe('x-csrf-token');
    });
  });

  describe('Initialization', () => {
    it('returns existing token if available', async () => {
      csrfManager.setToken('existing-token');
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'new-token' })
      });
      
      const token = await csrfManager.init();
      
      expect(token).toBe('existing-token');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('fetches new token if none exists', async () => {
      csrfManager.token = null;
      localStorage.removeItem('csrfToken');
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'initialized-token' })
      });
      
      const token = await csrfManager.init();
      
      expect(token).toBe('initialized-token');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('returns null on initialization failure', async () => {
      csrfManager.token = null;
      localStorage.removeItem('csrfToken');
      
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      const token = await csrfManager.init();
      
      expect(token).toBeNull();
    });
  });
});
