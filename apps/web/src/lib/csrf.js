/**
 * CSRF Token Manager
 * Handles fetching, storing, and refreshing CSRF tokens for API requests
 */

const CSRF_TOKEN_KEY = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';

class CSRFTokenManager {
    constructor() {
        this.baseURL = import.meta.env.VITE_API_URL || '/api';
    }

    /**
     * Get the CSRF token from localStorage
     * We don't use in-memory cache to ensure cross-tab synchronization
     * as the cookie is shared across tabs.
     */
    getToken() {
        return localStorage.getItem(CSRF_TOKEN_KEY);
    }

    /**
     * Store the CSRF token in localStorage
     */
    setToken(token) {
        localStorage.setItem(CSRF_TOKEN_KEY, token);
    }

    /**
     * Clear the stored CSRF token
     */
    clearToken() {
        localStorage.removeItem(CSRF_TOKEN_KEY);
    }

    /**
     * Fetch a new CSRF token from the server
     */
    async fetchToken() {
        try {
            // Use native fetch to avoid axios interceptors
            const response = await fetch(`${this.baseURL}/auth/csrf-token`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                credentials: 'include',
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch CSRF token: ${response.status}`);
            }

            const data = await response.json();

            if (data.csrfToken) {
                this.setToken(data.csrfToken);
                return data.csrfToken;
            }

            throw new Error('CSRF token not found in response');
        } catch (error) {
            console.error('Error fetching CSRF token:', error);
            throw error;
        }
    }

    /**
     * Get the CSRF header name
     */
    getHeaderName() {
        return CSRF_HEADER_NAME;
    }

    /**
     * Check if a request method requires CSRF token
     */
    requiresCSRF(method) {
        const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
        return mutatingMethods.includes(method.toUpperCase());
    }

    /**
     * Initialize CSRF token on app load
     */
    async init() {
        try {
            // Try to get existing token first
            let token = this.getToken();

            // If no token, fetch a new one
            if (!token) {
                token = await this.fetchToken();
            }

            return token;
        } catch (error) {
            console.error('Failed to initialize CSRF token:', error);
            return null;
        }
    }
}

// Export singleton instance
export const csrfManager = new CSRFTokenManager();

export default csrfManager;
