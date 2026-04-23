/**
 * Analytics Service
 * 
 * Privacy-focused analytics for ScreenSprout
 * - No personal data tracked
 * - Anonymized session IDs
 * - GDPR compliant
 */

const crypto = require('crypto');

class AnalyticsService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Generate anonymized session ID
   * Hashes user data to ensure privacy
   */
  generateSessionId(userId, userAgent, ip) {
    const data = `${userId}:${userAgent}:${ip}:${new Date().toISOString().split('T')[0]}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  /**
   * Hash user ID for tier tracking without storing actual ID
   */
  hashUserId(userId) {
    return crypto.createHash('sha256').update(String(userId)).digest('hex').substring(0, 16);
  }

  /**
   * Track an analytics event
   */
  async trackEvent({
    sessionId,
    eventType,
    eventName,
    pagePath = null,
    featureCategory = null,
    metadata = {},
    userTier = null,
    deviceType = 'desktop'
  }) {
    try {
      const query = `
        INSERT INTO analytics_events (
          session_id, event_type, event_name, page_path,
          feature_category, metadata, user_tier, device_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;
      
      const values = [
        sessionId,
        eventType,
        eventName,
        pagePath,
        featureCategory,
        JSON.stringify(metadata),
        userTier,
        deviceType
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      console.error('[Analytics] Error tracking event:', error);
      // Analytics errors should not break the app
      return null;
    }
  }

  /**
   * Track page view
   */
  async trackPageView(sessionId, pagePath, { userTier = null, deviceType = 'desktop' } = {}) {
    return this.trackEvent({
      sessionId,
      eventType: 'page_view',
      eventName: 'page_view',
      pagePath,
      featureCategory: this.getFeatureCategory(pagePath),
      metadata: { path: pagePath },
      userTier,
      deviceType
    });
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(sessionId, featureName, { 
    pagePath = null, 
    metadata = {}, 
    userTier = null,
    deviceType = 'desktop'
  } = {}) {
    const category = this.getFeatureCategory(pagePath) || featureName;
    
    return this.trackEvent({
      sessionId,
      eventType: 'feature_use',
      eventName: featureName,
      pagePath,
      featureCategory: category,
      metadata,
      userTier,
      deviceType
    });
  }

  /**
   * Track button click
   */
  async trackButtonClick(sessionId, buttonName, {
    pagePath = null,
    metadata = {},
    userTier = null,
    deviceType = 'desktop'
  } = {}) {
    return this.trackEvent({
      sessionId,
      eventType: 'button_click',
      eventName: buttonName,
      pagePath,
      featureCategory: this.getFeatureCategory(pagePath),
      metadata,
      userTier,
      deviceType
    });
  }

  /**
   * Track user flow start
   */
  async startUserFlow(sessionId, entryPage) {
    try {
      const query = `
        INSERT INTO analytics_user_flows (session_id, entry_page, page_sequence)
        VALUES ($1, $2, $3)
        ON CONFLICT (session_id) DO UPDATE SET
          pages_visited = analytics_user_flows.pages_visited + 1,
          page_sequence = analytics_user_flows.page_sequence || $4::jsonb
        RETURNING id
      `;
      
      await this.pool.query(query, [
        sessionId,
        entryPage,
        JSON.stringify([entryPage]),
        JSON.stringify([entryPage])
      ]);
    } catch (error) {
      console.error('[Analytics] Error tracking flow:', error);
    }
  }

  /**
   * Update user flow with page visit
   */
  async updateUserFlow(sessionId, pagePath) {
    try {
      const query = `
        UPDATE analytics_user_flows
        SET 
          pages_visited = pages_visited + 1,
          page_sequence = page_sequence || $2::jsonb,
          exit_page = $3
        WHERE session_id = $1
          AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
      `;
      
      await this.pool.query(query, [
        sessionId,
        JSON.stringify([pagePath]),
        pagePath
      ]);
    } catch (error) {
      console.error('[Analytics] Error updating flow:', error);
    }
  }

  /**
   * Complete user flow with goal
   */
  async completeUserFlow(sessionId, goalType, sessionDurationSeconds = null) {
    try {
      const query = `
        UPDATE analytics_user_flows
        SET 
          completed_goal = true,
          goal_type = $2,
          session_duration_seconds = COALESCE($3, session_duration_seconds)
        WHERE session_id = $1
          AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
      `;
      
      await this.pool.query(query, [sessionId, goalType, sessionDurationSeconds]);
    } catch (error) {
      console.error('[Analytics] Error completing flow:', error);
    }
  }

  /**
   * Get feature category from page path
   */
  getFeatureCategory(pagePath) {
    if (!pagePath) return null;
    
    const path = pagePath.toLowerCase();
    
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('child') || path.includes('kid')) return 'children';
    if (path.includes('device')) return 'devices';
    if (path.includes('schedule')) return 'schedules';
    if (path.includes('report')) return 'reports';
    if (path.includes('goal') || path.includes('reward')) return 'goals_rewards';
    if (path.includes('notification')) return 'notifications';
    if (path.includes('setting')) return 'settings';
    if (path.includes('webhook')) return 'webhooks';
    if (path.includes('filter') || path.includes('web')) return 'web_filtering';
    if (path.includes('location')) return 'location_tracking';
    if (path.includes('category')) return 'categories';
    if (path.includes('time-request')) return 'time_requests';
    if (path.includes('share') || path.includes('family')) return 'family_sharing';
    if (path.includes('monitor') || path.includes('live')) return 'live_monitor';
    if (path.includes('audit') || path.includes('log')) return 'audit_logs';
    if (path.includes('backup') || path.includes('export')) return 'backup_restore';
    
    return 'other';
  }

  /**
   * Get analytics dashboard data
   */
  async getDashboardData(days = 7) {
    const client = await this.pool.connect();
    
    try {
      // Daily engagement
      const engagementResult = await client.query(`
        SELECT * FROM analytics_engagement_daily
        WHERE stat_date >= CURRENT_DATE - INTERVAL '${days} days'
        ORDER BY stat_date DESC
      `);

      // Top features
      const featuresResult = await client.query(`
        SELECT * FROM analytics_top_features_week
      `);

      // Popular actions
      const actionsResult = await client.query(`
        SELECT * FROM analytics_popular_actions_week
      `);

      // Flow analysis
      const flowResult = await client.query(`
        SELECT * FROM analytics_flow_dropoff
      `);

      return {
        engagement: engagementResult.rows,
        topFeatures: featuresResult.rows,
        popularActions: actionsResult.rows,
        userFlows: flowResult.rows
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get analytics configuration for frontend
   * Returns basic tracking configuration (third-party analytics removed)
   */
  async getAnalyticsConfig() {
    try {
      const result = await this.pool.query(`
        SELECT config_key, config_value 
        FROM analytics_config 
        WHERE config_key = 'tracking_enabled'
      `);
      
      const config = {};
      result.rows.forEach(row => {
        config[row.config_key] = row.config_value.value;
      });
      
      return {
        tracking_enabled: config.tracking_enabled !== false
      };
    } catch (error) {
      console.error('[Analytics] Error getting config:', error);
      return {
        tracking_enabled: true
      };
    }
  }

  /**
   * Update daily stats (should be called by cron job)
   */
  async updateDailyStats() {
    try {
      await this.pool.query('SELECT update_daily_stats()');
      console.log('[Analytics] Daily stats updated');
    } catch (error) {
      console.error('[Analytics] Error updating daily stats:', error);
    }
  }

  /**
   * Cleanup old data (should be called by cron job)
   */
  async cleanupOldData() {
    try {
      await this.pool.query('SELECT cleanup_old_analytics_data()');
      console.log('[Analytics] Old data cleaned up');
    } catch (error) {
      console.error('[Analytics] Error cleaning up data:', error);
    }
  }
}

module.exports = AnalyticsService;
