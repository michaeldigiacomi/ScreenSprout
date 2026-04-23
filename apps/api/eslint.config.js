import js from '@eslint/js'
import globals from 'globals'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['node_modules', '__mocks__', 'coverage', 'test-results']),
  {
    files: ['**/*.js'],
    extends: [
      js.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
])
