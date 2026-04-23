/**
 * Analytics API Routes
 * 
 * Endpoints for tracking and retrieving analytics data
 */

const express = require('express');

function createAnalyticsRouter(analyticsService) {
  const router = express.Router();

  /**
   * POST /api/analytics/event
   * Track a single analytics event from the frontend
   */
  router.post('/event', async (req, res) => {
    try {
      const {
        eventType,
        eventName,
        pagePath,
        featureCategory,
        metadata = {},
        sessionId: providedSessionId
      } = req.body;

      if (!eventType || !eventName) {
        return res.status(400).json({ error: 'eventType and eventName are required' });
      }

      // Generate session ID if not provided
      const sessionId = providedSessionId || 
        analyticsService.generateSessionId(
          req.user?.id || 'anonymous',
          req.headers['user-agent'] || '',
          req.ip
        );

      // Detect device type from user agent
      const deviceType = detectDeviceType(req.headers['user-agent']);

      const eventId = await analyticsService.trackEvent({
        sessionId,
        eventType,
        eventName,
        pagePath,
        featureCategory,
        metadata,
        userTier: req.user?.tier || 'free',
        deviceType
      });

      res.json({ success: true, eventId, sessionId });
    } catch (error) {
      console.error('[Analytics API] Error tracking event:', error);
      // Return success even on error to not break the frontend
      res.json({ success: true });
    }
  });

  /**
   * POST /api/analytics/batch
   * Track multiple events at once (for batching)
   */
  router.post('/batch', async (req, res) => {
    try {
      const { events, sessionId: providedSessionId } = req.body;

      if (!Array.isArray(events)) {
        return res.status(400).json({ error: 'events must be an array' });
      }

      const sessionId = providedSessionId || 
        analyticsService.generateSessionId(
          req.user?.id || 'anonymous',
          req.headers['user-agent'] || '',
          req.ip
        );

      const deviceType = detectDeviceType(req.headers['user-agent']);

      // Track all events
      const results = await Promise.all(
        events.map(event => 
          analyticsService.trackEvent({
            sessionId,
            eventType: event.eventType,
            eventName: event.eventName,
            pagePath: event.pagePath,
            featureCategory: event.featureCategory,
            metadata: event.metadata || {},
            userTier: req.user?.tier || 'free',
            deviceType
          })
        )
      );

      res.json({ success: true, tracked: results.length, sessionId });
    } catch (error) {
      console.error('[Analytics API] Error tracking batch:', error);
      res.json({ success: true });
    }
  });

  /**
   * POST /api/analytics/pageview
   * Track page view with flow tracking
   */
  router.post('/pageview', async (req, res) => {
    try {
      const { pagePath, isFirstVisit, sessionId: providedSessionId } = req.body;

      const sessionId = providedSessionId || 
        analyticsService.generateSessionId(
          req.user?.id || 'anonymous',
          req.headers['user-agent'] || '',
          req.ip
        );

      const deviceType = detectDeviceType(req.headers['user-agent']);

      // Track page view
      await analyticsService.trackPageView(sessionId, pagePath, {
        userTier: req.user?.tier || 'free',
        deviceType
      });

      // Track user flow
      if (isFirstVisit) {
        await analyticsService.startUserFlow(sessionId, pagePath);
      } else {
        await analyticsService.updateUserFlow(sessionId, pagePath);
      }

      res.json({ success: true, sessionId });
    } catch (error) {
      console.error('[Analytics API] Error tracking pageview:', error);
      res.json({ success: true, sessionId: req.body.sessionId });
    }
  });

  /**
   * POST /api/analytics/goal
   * Mark a user flow as completed with a goal
   */
  router.post('/goal', async (req, res) => {
    try {
      const { goalType, sessionDurationSeconds, sessionId: providedSessionId } = req.body;

      const sessionId = providedSessionId || 
        analyticsService.generateSessionId(
          req.user?.id || 'anonymous',
          req.headers['user-agent'] || '',
          req.ip
        );

      await analyticsService.completeUserFlow(sessionId, goalType, sessionDurationSeconds);

      res.json({ success: true });
    } catch (error) {
      console.error('[Analytics API] Error completing goal:', error);
      res.json({ success: true });
    }
  });

  /**
   * GET /api/analytics/config
   * Get analytics configuration for frontend
   */
  router.get('/config', async (req, res) => {
    try {
      const config = await analyticsService.getAnalyticsConfig();
      res.json(config);
    } catch (error) {
      console.error('[Analytics API] Error getting config:', error);
      res.json({
        tracking_enabled: true
      });
    }
  });

  /**
   * GET /api/analytics/dashboard
   * Get analytics dashboard data (admin only)
   */
  router.get('/dashboard', async (req, res) => {
    try {
      // TODO: Add admin authentication check
      const days = parseInt(req.query.days) || 7;
      const data = await analyticsService.getDashboardData(days);
      res.json(data);
    } catch (error) {
      console.error('[Analytics API] Error getting dashboard:', error);
      res.status(500).json({ error: 'Failed to get analytics data' });
    }
  });

  /**
   * GET /api/analytics/stats
   * Get quick stats for admin dashboard
   */
  router.get('/stats', async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 7;
      
      const result = await analyticsService.pool.query(`
        SELECT 
          COUNT(DISTINCT session_id) as unique_sessions,
          COUNT(*) as total_events,
          COUNT(*) FILTER (WHERE event_type = 'page_view') as page_views,
          COUNT(*) FILTER (WHERE event_type = 'button_click') as button_clicks,
          COUNT(*) FILTER (WHERE event_type = 'feature_use') as feature_uses
        FROM analytics_events
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
      `);

      res.json(result.rows[0]);
    } catch (error) {
      console.error('[Analytics API] Error getting stats:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  return router;
}

/**
 * Detect device type from user agent
 */
function detectDeviceType(userAgent) {
  if (!userAgent) return 'desktop';
  
  const ua = userAgent.toLowerCase();
  
  if (/mobile|android|iphone|ipad|ipod/.test(ua)) {
    if (/ipad|tablet/.test(ua) || (!/mobile/.test(ua) && /android/.test(ua))) {
      return 'tablet';
    }
    return 'mobile';
  }
  
  return 'desktop';
}

module.exports = { createAnalyticsRouter };
