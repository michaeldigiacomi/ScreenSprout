/**
 * useAnalytics Hook
 * 
 * React hook for tracking analytics events
 * Automatically tracks page views and provides methods for custom tracking
 */

import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import analytics from '../lib/analytics';

export function useAnalytics() {
  const location = useLocation();
  const isFirstVisit = useRef(true);
  const sessionStartTime = useRef(null);

  // Initialize session start time in effect
  useEffect(() => {
    sessionStartTime.current = Date.now();
  }, []);

  // Initialize analytics on mount
  useEffect(() => {
    analytics.init();
    
    return () => {
      // Track session duration on unmount
      if (sessionStartTime.current) {
        const duration = Math.floor((Date.now() - sessionStartTime.current) / 1000);
        analytics.trackEvent('session_end', 'session', { duration });
      }
    };
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (isFirstVisit.current) {
      isFirstVisit.current = false;
    } else {
      analytics.trackPageView(location.pathname, false);
    }
  }, [location.pathname]);

  /**
   * Track a button click
   */
  const trackClick = useCallback((buttonName, metadata = {}) => {
    analytics.trackButtonClick(buttonName, metadata);
  }, []);

  /**
   * Track feature usage
   */
  const trackFeature = useCallback((featureName, metadata = {}) => {
    analytics.trackFeatureUsage(featureName, metadata);
  }, []);

  /**
   * Track a custom event
   */
  const trackEvent = useCallback((eventName, eventType = 'custom', metadata = {}) => {
    analytics.trackEvent(eventName, eventType, metadata);
  }, []);

  /**
   * Track goal completion
   */
  const trackGoal = useCallback((goalType) => {
    const startTime = sessionStartTime.current || Date.now();
    const duration = Math.floor((Date.now() - startTime) / 1000);
    analytics.trackGoal(goalType, duration);
  }, []);

  return {
    trackClick,
    trackFeature,
    trackEvent,
    trackGoal,
    sessionId: analytics.sessionId
  };
}

/**
 * useTrackMount Hook
 * 
 * Track when a component/page is mounted
 */
export function useTrackMount(pageName, metadata = {}) {
  useEffect(() => {
    analytics.trackEvent(`${pageName}_viewed`, 'page_view', metadata);
  }, [pageName, metadata]);
}

/**
 * useTrackFeature Hook
 * 
 * Track feature usage with automatic metadata
 */
export function useTrackFeature(featureName) {
  const track = useCallback((action = 'used', metadata = {}) => {
    analytics.trackFeatureUsage(featureName, { action, ...metadata });
  }, [featureName]);

  return track;
}
