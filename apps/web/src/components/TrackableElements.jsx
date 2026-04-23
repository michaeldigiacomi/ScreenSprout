/**
 * TrackableButton Component
 * 
 * A button wrapper that automatically tracks clicks
 */

import React from 'react';
import analytics from '../lib/analytics';

export function TrackableButton({ 
  children, 
  onClick, 
  trackName, 
  trackMetadata = {},
  ...props 
}) {
  const handleClick = (e) => {
    // Track the click
    if (trackName) {
      analytics.trackButtonClick(trackName, {
        page: window.location.pathname,
        ...trackMetadata
      });
    }

    // Call original onClick
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

/**
 * TrackableLink Component
 * 
 * A link wrapper that tracks navigation
 */
export function TrackableLink({ 
  children, 
  onClick, 
  href,
  trackName,
  trackMetadata = {},
  ...props 
}) {
  const handleClick = (e) => {
    // Track the click
    if (trackName) {
      analytics.trackButtonClick(trackName, {
        href,
        page: window.location.pathname,
        ...trackMetadata
      });
    }

    // Call original onClick
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
