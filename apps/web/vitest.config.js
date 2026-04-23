// web/vitest.config.js
/**
 * Vitest Configuration for ScreenSprout Frontend
 * 
 * This configuration sets up Vitest for testing the React frontend
 * with support for component tests, coverage, and MSW for API mocking.
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // Use the same plugins as the main app
  plugins: [react()],
  
  test: {
    // Use jsdom for browser-like environment
    environment: 'jsdom',
    
    // Global test setup
    globals: true,
    
    // Setup files to run before tests
    setupFiles: ['./tests/setup.js'],
    
    // Include patterns for test files
    include: [
      'src/**/*.{test,spec}.{js,jsx}',
      'tests/**/*.{test,spec}.{js,jsx}'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'tests/e2e',
      'tests/visual'
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',
      
      // Files to include in coverage
      include: [
        'src/**/*.{js,jsx}'
      ],
      
      // Files to exclude from coverage
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/main.jsx',
        '**/index.js'
      ],
      
      // Coverage thresholds (set to 0 for CI pipeline)
      thresholds: {
        global: {
          branches: 0,
          functions: 0,
          lines: 0,
          statements: 0
        }
      }
    },
    
    // Mock configuration
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    
    // Test timeout (10 seconds default)
    testTimeout: 10000,
    
    // Reporter configuration
    reporters: ['verbose'],
    
    // CSS handling for tests
    css: {
      include: [/\.css$/],
      modules: {
        classNameStrategy: 'non-scoped'
      }
    },
    
    // Transform handling
    deps: {
      optimizer: {
        web: {
          include: [/node_modules/]
        }
      }
    },
    
    // For debugging tests
    // Uncomment to run tests sequentially with logs visible
    // pool: 'forks',
    // poolOptions: {
    //   forks: {
    //     singleFork: true
    //   }
    // }
  },
  
  // Resolve configuration (same as main app)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@assets': path.resolve(__dirname, './src/assets')
    }
  }
});
