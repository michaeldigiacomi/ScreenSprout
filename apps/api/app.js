/**
 * Express App Factory (Refactored)
 * 
 * Creates and configures the Express application.
 * This file is now a clean shell that imports modules from src/.
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
require('dotenv').config();

// Config & Middleware
const { createPool, initDb, DB_CONFIG } = require('./src/config/db');
const {
  authenticateToken,
  verifyDeviceOwnership,
  verifyChildOwnership,
  JWT_SECRET,
  JWT_EXPIRATION,
  BCRYPT_ROUNDS
} = require('./src/middleware/auth');
const { limiter, authLimiter } = require('./src/middleware/rateLimit');
const { metricsMiddleware, register } = require('./src/middleware/metrics');
const { generateCsrfToken } = require('./src/middleware/csrf');

// Services
const AnalyticsService = require('./src/services/analytics');

// Routes
const { createAnalyticsRouter } = require('./src/routes/analytics');
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const childrenRoutes = require('./src/routes/children');
const deviceRoutes = require('./src/routes/devices');
const gamificationRoutes = require('./src/routes/gamification');
const notificationRoutes = require('./src/routes/notifications');
const settingsRoutes = require('./src/routes/settings');
const geofenceRoutes = require('./src/routes/geofences');
const locationRoutes = require('./src/routes/locations');
const webFilterRoutes = require('./src/routes/web-filter');
const scheduleRoutes = require('./src/routes/schedules');
const deviceApiRoutes = require('./src/routes/deviceApi');

// ============================================
// APP FACTORY FUNCTION
// ============================================

function createApp(options = {}) {
  const app = express();

  // Use Helmet for security headers
  // Use Helmet for security headers with custom CSP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://*"],
        connectSrc: ["'self'", "https://app.screensprout.digitaladrenalin.net", "wss://app.screensprout.digitaladrenalin.net", "https://api.screensprout.digitaladrenalin.net"],
        upgradeInsecureRequests: [],
      },
    },
  }));

  // Allow injecting dependencies for testing
  const testPool = options.pool;
  const skipDbInit = options.skipDbInit || false;

  // Create or reuse database pool
  const pool = createPool(options);

  // Expose pool to routes via req.app.get('db')
  app.set('db', pool);

  // Initialize Schema (skip in test mode if requested)
  if (!skipDbInit && !testPool) {
    initDb(pool);
  }

  // ============================================
  // MIDDLEWARE SETUP
  // ============================================

  // CORS Configuration
  const ALLOWED_ORIGINS = [
    'https://screensprout.digitaladrenalin.net',
    'https://app.screensprout.digitaladrenalin.net',
    'https://api.screensprout.digitaladrenalin.net',
    'http://screensprout.digitaladrenalin.net',
    'http://app.screensprout.digitaladrenalin.net',
    'http://api.screensprout.digitaladrenalin.net',
    'http://localhost:5173',  // Development
    'http://localhost:3000',
  ];

  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  };

  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(bodyParser.json());

  // Health check endpoint - NO rate limiting
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Rate limiting & Metrics
  app.use(limiter);
  app.use(metricsMiddleware);

  // Trust proxy for rate limiting behind gateway
  app.set('trust proxy', 1);

  // ============================================
  // ROUTES
  // ============================================

  // Metrics Endpoint (Prometheus)
  // Accessible without auth for K8s Prometheus scraping
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (err) {
      res.status(500).end(err.message);
    }
  });

  // Initialize Services
  const analyticsService = new AnalyticsService(pool);

  // ============================================
  // API Route Mounts (single mount per router)
  // ============================================

  app.use('/api/auth', authRoutes);
  app.use('/api', userRoutes); // /api/profile, /api/share
  app.use('/api/children', childrenRoutes);
  app.use('/api/devices', deviceRoutes);
  app.use('/api', gamificationRoutes); // /api/goals, /api/rewards, /api/points, /api/bonus-time
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/geofences', geofenceRoutes);
  app.use('/api/locations', locationRoutes);
  app.use('/api/web-filter', webFilterRoutes);
  app.use('/api/schedules', scheduleRoutes);
  app.use('/api/analytics', createAnalyticsRouter(analyticsService));
  app.use('/api/device', deviceApiRoutes);

  // ============================================
  // Legacy path aliases (backward compatibility)
  // ============================================

  // /api/device/enroll (singular) → forward to deviceRoutes /enroll
  app.post('/api/device/enroll', (req, res, next) => {
    req.url = '/enroll';
    deviceRoutes(req, res, next);
  });

  // /api/policy/:deviceId → forward to deviceRoutes /policy/:deviceId
  app.get('/api/policy/:deviceId', (req, res, next) => {
    req.url = `/policy/${req.params.deviceId}`;
    deviceRoutes(req, res, next);
  });
  app.put('/api/policy/:deviceId', (req, res, next) => {
    req.url = `/policy/${req.params.deviceId}`;
    deviceRoutes(req, res, next);
  });

  // /api/stats/:deviceId → forward to deviceRoutes /stats/:deviceId
  app.get('/api/stats/:deviceId', (req, res, next) => {
    req.url = `/stats/${req.params.deviceId}`;
    deviceRoutes(req, res, next);
  });

  // Error handling middleware
  app.use((err, req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Export the app and utilities for testing
  return {
    app,
    pool,
    analyticsService,
    authenticateToken,
    verifyDeviceOwnership,
    verifyChildOwnership,
    generateCsrfToken
  };
}

module.exports = { createApp, JWT_SECRET, JWT_EXPIRATION, BCRYPT_ROUNDS };
