/**
 * ScreenSprout Backend API Server
 * 
 * This is the entry point for the production server.
 * It creates the app using the app factory and starts the HTTP server.
 * WebSocket server is attached for real-time communication.
 * 
 * For testing, use app.js which exports the createApp factory function.
 */

const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');
const { createApp } = require('./app');

// Create the app with default configuration
const { app, pool } = createApp();

const port = process.env.PORT || 3000;

// Create HTTP server (needed for WebSocket upgrade)
const server = http.createServer(app);

// Create WebSocket server attached to HTTP server
const wss = new WebSocket.Server({
  server,
    path: '/api/ws',
  // Handle WebSocket upgrade properly behind reverse proxy
  perMessageDeflate: false,
  clientTracking: true
});

// Store connected clients with their metadata
const clients = new Map();

// Connection rate limiting: track connections per IP
const connectionCounts = new Map();
const WS_MAX_CONNECTIONS_PER_IP = 10;
const WS_RATE_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_TOTAL_CLIENTS = 1000;

// Clean up rate limit counters periodically
setInterval(() => {
  connectionCounts.clear();
}, WS_RATE_WINDOW_MS).unref();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // Rate limit: check connections per IP
  const currentCount = connectionCounts.get(clientIp) || 0;
  if (currentCount >= WS_MAX_CONNECTIONS_PER_IP) {
    console.warn(`[WebSocket] Rate limit exceeded for IP: ${clientIp}`);
    ws.close(1008, 'Too many connections');
    return;
  }
  connectionCounts.set(clientIp, currentCount + 1);

  // Total client cap
  if (clients.size >= MAX_TOTAL_CLIENTS) {
    console.warn('[WebSocket] Max total clients reached, rejecting connection');
    ws.close(1013, 'Server at capacity');
    return;
  }

  const clientId = generateClientId();
  const clientInfo = {
    id: clientId,
    connectedAt: new Date(),
    ip: clientIp,
    userAgent: req.headers['user-agent'],
    isAuthenticated: false,
    userId: null
  };

  clients.set(ws, clientInfo);
  console.log(`[WebSocket] Client connected: ${clientId} from ${clientInfo.ip}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    clientId: clientId,
    timestamp: new Date().toISOString()
  }));

  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`[WebSocket] Message from ${clientId}:`, message.type);

      switch (message.type) {
        case 'auth':
          // Handle authentication
          handleAuth(ws, clientInfo, message);
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;

        case 'heartbeat':
          // Device heartbeat - update last seen
          handleHeartbeat(ws, clientInfo, message);
          break;

        case 'subscribe':
          // Subscribe to updates (e.g., device updates for a user)
          handleSubscribe(ws, clientInfo, message);
          break;

        default:
          console.log(`[WebSocket] Unknown message type: ${message.type}`);
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
      }
    } catch (err) {
      console.error('[WebSocket] Error handling message:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  // Handle client disconnect
  ws.on('close', (code, _reason) => {
    console.log(`[WebSocket] Client disconnected: ${clientId}, code: ${code}`);
    clients.delete(ws);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`[WebSocket] Error for client ${clientId}:`, error);
  });
});

// Generate unique client ID
function generateClientId() {
  return `ws_${crypto.randomUUID()}`;
}

// Handle authentication
async function handleAuth(ws, clientInfo, message) {
  try {
    const { token } = message;
    if (!token) {
      ws.send(JSON.stringify({ type: 'auth', status: 'error', message: 'No token provided' }));
      return;
    }

    // Verify JWT token (reuse the JWT_SECRET from app.js)
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('./app');

    const decoded = jwt.verify(token, JWT_SECRET);
    clientInfo.isAuthenticated = true;
    clientInfo.userId = decoded.id;
    clientInfo.username = decoded.username;

    ws.send(JSON.stringify({
      type: 'auth',
      status: 'success',
      user: { id: decoded.id, username: decoded.username }
    }));
    console.log(`[WebSocket] Client ${clientInfo.id} authenticated as ${decoded.username}`);
  } catch (err) {
    console.error('[WebSocket] Auth error:', err);
    ws.send(JSON.stringify({ type: 'auth', status: 'error', message: 'Invalid token' }));
  }
}

// Handle heartbeat from devices
async function handleHeartbeat(ws, clientInfo, message) {
  // Require authentication
  if (!clientInfo.isAuthenticated) {
    ws.send(JSON.stringify({ type: 'error', message: 'Authentication required for heartbeat' }));
    return;
  }

  try {
    const { deviceId } = message;

    if (!deviceId) {
      ws.send(JSON.stringify({ type: 'error', message: 'deviceId is required' }));
      return;
    }

    // Verify device ownership before updating
    if (pool) {
      const ownerCheck = await pool.query(
        'SELECT 1 FROM devices WHERE id = $1 AND user_id = $2',
        [deviceId, clientInfo.userId]
      );

      if (ownerCheck.rows.length === 0) {
        ws.send(JSON.stringify({ type: 'error', message: 'Device not found or access denied' }));
        return;
      }

      await pool.query(
        'UPDATE devices SET last_seen = NOW() WHERE id = $1',
        [deviceId]
      );
    }

    // Acknowledge heartbeat
    ws.send(JSON.stringify({
      type: 'heartbeat',
      status: 'received',
      timestamp: new Date().toISOString()
    }));
  } catch (err) {
    console.error('[WebSocket] Heartbeat error:', err.message);
  }
}

// Handle subscription requests
function handleSubscribe(ws, clientInfo, message) {
  const { channel } = message;

  if (!clientInfo.isAuthenticated) {
    ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
    return;
  }

  clientInfo.subscription = channel;
  ws.send(JSON.stringify({ type: 'subscribe', status: 'success', channel }));
  console.log(`[WebSocket] Client ${clientInfo.id} subscribed to ${channel}`);
}

// Broadcast message to all connected clients (optionally filtered)
function broadcast(message, filter = null) {
  const data = typeof message === 'string' ? message : JSON.stringify(message);

  clients.forEach((clientInfo, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      if (filter && !filter(clientInfo)) return;
      ws.send(data);
    }
  });
}

// Broadcast to specific user
function broadcastToUser(userId, message) {
  broadcast(message, (clientInfo) => clientInfo.userId === userId);
}

// Export for use in other modules (e.g., to broadcast from API routes)
module.exports = { broadcast, broadcastToUser, wss };

// Start the server
server.listen(port, () => {
  console.log(`ScreenSprout API server running on port ${port}`);
  console.log(`WebSocket server running on ws://localhost:${port}/api/ws`);
});
