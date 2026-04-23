// web/tests/setup.js
/**
 * Test Setup for Frontend Tests
 * 
 * This file configures the testing environment before tests run.
 * It sets up MSW (Mock Service Worker) for API mocking and
 * configures Jest-DOM matchers.
 */

import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Import MSW server
import { server } from './mocks/server';

// Extend Vitest's expect with Jest-DOM matchers
// This provides matchers like toBeInTheDocument(), toHaveClass(), etc.
expect.extend(matchers);

// Start MSW before all tests
beforeAll(() => {
  // Enable API mocking
  server.listen({ 
    onUnhandledRequest: (req) => {
      if (req.url.includes('/ws') || req.url.includes('favicon.ico')) {
        return;
      }
      console.error(`Found an unhandled ${req.method} request to ${req.url}`);
    } 
  });
});

// Reset handlers after each test for isolation
afterEach(() => {
  // Clean up mounted React trees
  cleanup();
  
  // Reset any request handlers that were added during tests
  server.resetHandlers();
  
  // Clear localStorage
  localStorage.clear();
  
  // Clear any mocked timers
  vi.clearAllTimers();
});

// Stop MSW after all tests
afterAll(() => {
  server.close();
});

// Mock window.matchMedia (used by some UI libraries)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver (used for lazy loading, etc.)
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }
}

const mockStorage = new LocalStorageMock();

Object.defineProperty(window, 'localStorage', {
  value: mockStorage,
  writable: true
});

try {
    Object.defineProperty(global, 'localStorage', {
      value: mockStorage,
      writable: true
    });
} catch (e) {
    console.warn('Could not define global.localStorage', e);
}

// Mock scrollTo
window.scrollTo = vi.fn();

