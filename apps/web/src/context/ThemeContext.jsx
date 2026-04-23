import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

const ThemeContext = createContext({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => { },
  toggleTheme: () => { },
});

// Helper to resolve system theme
const getSystemTheme = () => {
  if (typeof window === 'undefined') return 'light';
  if (!window.matchMedia) return 'light';
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  if (!mediaQuery) return 'light';
  return mediaQuery.matches ? 'dark' : 'light';
};

// Helper to resolve actual theme from preference
const resolveTheme = (themePreference) => {
  if (themePreference === 'system') {
    return getSystemTheme();
  }
  return themePreference;
};

// Helper to apply theme classes to document (no setState)
const applyThemeToDocument = (resolved) => {
  const root = document.documentElement;

  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
};

export function ThemeProvider({ children }) {
  // Initialize from localStorage or default to system
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'system';
    return localStorage.getItem('theme') || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(theme));

  // Compute resolved theme based on current theme preference
  const computedResolved = useMemo(() => resolveTheme(theme), [theme]);

  // Apply theme to document when resolved theme changes
  useEffect(() => {
    applyThemeToDocument(computedResolved);
    setResolvedTheme(computedResolved);
  }, [computedResolved]);

  // Set theme and persist
  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    // Theme change will trigger the useEffect above via computedResolved

    // Sync with server if authenticated
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/settings/theme', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': localStorage.getItem('csrfToken') || '',
        },
        body: JSON.stringify({ theme: newTheme }),
      }).catch(err => console.error('[Theme] Failed to sync with server:', err));
    }
  };

  // Toggle between light/dark (skip system for quick toggle)
  const toggleTheme = () => {
    const current = resolvedTheme;
    const next = current === 'light' ? 'dark' : 'light';
    setTheme(next);
  };

  // Load theme from server on mount (if authenticated)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const currentTheme = theme;

    if (token && userStr) {
      // First check user object from login
      try {
        const user = JSON.parse(userStr);
        if (user.theme && user.theme !== currentTheme) {
          setThemeState(user.theme);
          localStorage.setItem('theme', user.theme);
          return;
        }
      } catch {
        // Silently ignore parse errors
      }

      // Fallback to fetching from API
      fetch('/api/settings/theme', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(res => {
          if (!res.ok) throw new Error('Theme fetch failed');
          return res.json();
        })
        .then(data => {
          if (data.theme && data.theme !== currentTheme) {
            setThemeState(data.theme);
            localStorage.setItem('theme', data.theme);
          }
        })
        .catch(err => console.error('[Theme] Failed to load from server:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (!mediaQuery || !mediaQuery.addEventListener) return;

    const handleChange = () => {
      if (theme === 'system') {
        // This will trigger the computedResolved useEffect
        setThemeState('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      if (mediaQuery && mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      }
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// useTheme hook for consuming the theme context
// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
