/**
 * Analytics Service
 * 
 * Client-side analytics tracking for ScreenSprout
 * Privacy-focused custom event tracking only (no third-party analytics)
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://app.screensprout.digitaladrenalin.net';

class AnalyticsService {
  constructor() {
    this.sessionId = null;
    this.config = null;
    this.initialized = false;
    this.eventQueue = [];
    this.flushInterval = null;
  }

  /**
   * Initialize analytics service
   */
  async init() {
    if (this.initialized) return;

    try {
      // Fetch analytics configuration from backend
      const response = await axios.get(`${API_URL}/api/analytics/config`);
      this.config = response.data;

      // Generate or retrieve session ID
      this.sessionId = this.getOrCreateSessionId();

      // Start event queue flush interval
      this.startFlushInterval();

      // Track initial page view
      this.trackPageView(window.location.pathname, true);

      this.initialized = true;
      console.log('[Analytics] Initialized');
    } catch (error) {
      console.error('[Analytics] Initialization error:', error);
      // Continue without analytics if backend is unavailable
      this.sessionId = this.getOrCreateSessionId();
      this.initialized = true;
    }
  }

  /**
   * Get or create session ID
   */
  getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = this.generateSessionId();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return 'ss_' + Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Track a page view
   */
  trackPageView(path, isFirstVisit = false) {
    if (!this.config?.tracking_enabled) return;

    // Track in our backend
    this.queueEvent({
      type: 'pageview',
      data: {
        pagePath: path,
        isFirstVisit,
        sessionId: this.sessionId
      }
    });

    // Update user flow
    if (!isFirstVisit) {
      this.queueEvent({
        type: 'flow_update',
        data: {
          pagePath: path,
          sessionId: this.sessionId
        }
      });
    }
  }

  /**
   * Track a button click
   */
  trackButtonClick(buttonName, metadata = {}) {
    if (!this.config?.tracking_enabled) return;

    // Track in our backend
    this.queueEvent({
      type: 'event',
      data: {
        eventType: 'button_click',
        eventName: buttonName,
        pagePath: window.location.pathname,
        metadata,
        sessionId: this.sessionId
      }
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(featureName, metadata = {}) {
    if (!this.config?.tracking_enabled) return;

    // Track in our backend
    this.queueEvent({
      type: 'event',
      data: {
        eventType: 'feature_use',
        eventName: featureName,
        pagePath: window.location.pathname,
        featureCategory: this.getFeatureCategory(featureName),
        metadata,
        sessionId: this.sessionId
      }
    });
  }

  /**
   * Track a custom event
   */
  trackEvent(eventName, eventType = 'custom', metadata = {}) {
    if (!this.config?.tracking_enabled) return;

    // Track in our backend
    this.queueEvent({
      type: 'event',
      data: {
        eventType,
        eventName,
        pagePath: window.location.pathname,
        metadata,
        sessionId: this.sessionId
      }
    });
  }

  /**
   * Track goal completion
   */
  trackGoal(goalType, sessionDurationSeconds = null) {
    if (!this.config?.tracking_enabled) return;

    // Track in our backend
    this.queueEvent({
      type: 'goal',
      data: {
        goalType,
        sessionDurationSeconds,
        sessionId: this.sessionId
      }
    });
  }

  /**
   * Queue an event for batch sending
   */
  queueEvent(event) {
    this.eventQueue.push(event);
    
    // Flush immediately if queue gets large
    if (this.eventQueue.length >= 10) {
      this.flushEvents();
    }
  }

  /**
   * Start flush interval for batching events
   */
  startFlushInterval() {
    // Flush every 5 seconds
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 5000);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flushEvents();
    });
  }

  /**
   * Flush queued events to backend
   */
  async flushEvents() {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Group events by type for batch processing
      const pageViews = events.filter(e => e.type === 'pageview').map(e => e.data);
      const customEvents = events.filter(e => e.type === 'event').map(e => e.data);
      const goals = events.filter(e => e.type === 'goal').map(e => e.data);
      const flowUpdates = events.filter(e => e.type === 'flow_update').map(e => e.data);

      // Send page views
      if (pageViews.length > 0) {
        await Promise.all(pageViews.map(pv => 
          axios.post(`${API_URL}/api/analytics/pageview`, pv).catch(() => {})
        ));
      }

      // Send custom events in batch
      if (customEvents.length > 0) {
        await axios.post(`${API_URL}/api/analytics/batch`, {
          events: customEvents,
          sessionId: this.sessionId
        }).catch(() => {});
      }

      // Send goals
      if (goals.length > 0) {
        await Promise.all(goals.map(g => 
          axios.post(`${API_URL}/api/analytics/goal`, g).catch(() => {})
        ));
      }

      // Send flow updates
      if (flowUpdates.length > 0) {
        await Promise.all(flowUpdates.map(fu => 
          axios.post(`${API_URL}/api/analytics/pageview`, {
            ...fu,
            isFirstVisit: false
          }).catch(() => {})
        ));
      }
    } catch (error) {
      // Silently fail - analytics shouldn't break the app
      console.debug('[Analytics] Flush error:', error);
    }
  }

  /**
   * Get feature category from feature name
   */
  getFeatureCategory(featureName) {
    const categories = {
      'add_child': 'children',
      'edit_child': 'children',
      'delete_child': 'children',
      'add_device': 'devices',
      'edit_device': 'devices',
      'delete_device': 'devices',
      'create_schedule': 'schedules',
      'edit_schedule': 'schedules',
      'delete_schedule': 'schedules',
      'export_report': 'reports',
      'view_report': 'reports',
      'create_goal': 'goals_rewards',
      'redeem_reward': 'goals_rewards',
      'create_webhook': 'webhooks',
      'add_filter': 'web_filtering',
      'enable_filter': 'web_filtering',
      'create_time_request': 'time_requests',
      'approve_time_request': 'time_requests',
      'share_access': 'family_sharing',
      'view_live_monitor': 'live_monitor',
      'view_audit_logs': 'audit_logs',
      'export_backup': 'backup_restore',
      'import_backup': 'backup_restore'
    };

    return categories[featureName] || 'other';
  }

  /**
   * Get analytics dashboard data (for admin)
   */
  async getDashboardData(days = 7) {
    const response = await axios.get(`${API_URL}/api/analytics/dashboard?days=${days}`);
    return response.data;
  }

  /**
   * Get quick stats (for admin)
   */
  async getStats(days = 7) {
    const response = await axios.get(`${API_URL}/api/analytics/stats?days=${days}`);
    return response.data;
  }

  /**
   * Cleanup on logout
   */
  cleanup() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushEvents();
  }
}

// Create singleton instance
const analytics = new AnalyticsService();

export default analytics;
