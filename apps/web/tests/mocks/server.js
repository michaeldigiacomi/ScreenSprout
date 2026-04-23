// web/tests/mocks/server.js
/**
 * MSW Server Setup
 * 
 * Creates and configures the MSW server for Node.js test environment.
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create server with default handlers
export const server = setupServer(...handlers);
