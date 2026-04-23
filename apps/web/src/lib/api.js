import axios from 'axios';
import csrfManager from './csrf';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    withCredentials: true, // Required for CSRF cookies to be sent
});

// Track if we're currently refreshing the CSRF token to prevent multiple simultaneous refreshes
let isRefreshingCsrf = false;
let pendingRequests = [];

// Add a request interceptor to include auth token and CSRF token
api.interceptors.request.use(
    async (config) => {
        // Add Authorization header
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add CSRF token for mutating requests (POST, PUT, DELETE, PATCH)
        if (csrfManager.requiresCSRF(config.method)) {
            let csrfToken = csrfManager.getToken();

            // If no CSRF token is available, fetch one before proceeding
            if (!csrfToken) {
                try {
                    csrfToken = await csrfManager.fetchToken();
                } catch (err) {
                    console.warn('[API] Failed to fetch CSRF token:', err);
                }
            }

            if (csrfToken) {
                config.headers[csrfManager.getHeaderName()] = csrfToken;
            }
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 403 CSRF errors
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Check if this is a 403 CSRF error specifically (not a general auth 403)
        const isCsrfError = error.response?.status === 403 &&
            csrfManager.requiresCSRF(originalRequest.method) &&
            !originalRequest._csrfRetry &&
            // Only retry CSRF if the error message indicates a CSRF problem
            (error.response?.data?.error?.toLowerCase().includes('csrf') ||
                error.response?.data?.error?.toLowerCase().includes('token'));

        if (isCsrfError) {
            // If we're already refreshing, queue this request
            if (isRefreshingCsrf) {
                return new Promise((resolve) => {
                    pendingRequests.push(() => {
                        resolve(api(originalRequest));
                    });
                });
            }

            // Mark that we're retrying with a new CSRF token
            originalRequest._csrfRetry = true;
            isRefreshingCsrf = true;

            try {
                // Fetch a new CSRF token
                await csrfManager.fetchToken();

                // Update the request with the new CSRF token
                const newToken = csrfManager.getToken();
                originalRequest.headers[csrfManager.getHeaderName()] = newToken;

                // Retry the original request
                const response = await api(originalRequest);

                // Process any pending requests
                pendingRequests.forEach(callback => callback());
                pendingRequests = [];

                return response;
            } catch (refreshError) {
                // CSRF refresh failed - clear token and reject
                csrfManager.clearToken();

                // Process pending requests with the error
                pendingRequests.forEach(callback => callback());
                pendingRequests = [];

                return Promise.reject(refreshError);
            } finally {
                isRefreshingCsrf = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
