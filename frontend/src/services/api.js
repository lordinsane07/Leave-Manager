import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

// Create Axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true, // Send cookies for refresh token
});

// Request interceptor — attach access token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — handle 401 with token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const url = originalRequest?.url || '';

        // Skip token refresh for auth endpoints — they naturally return 401
        const isAuthRoute = url.includes('/auth/');

        // If 401 and not already retried and not an auth route, attempt token refresh
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
            originalRequest._retry = true;

            try {
                const { data } = await axios.post(
                    `${API_BASE_URL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                const newToken = data.data?.accessToken;
                if (newToken) {
                    localStorage.setItem('accessToken', newToken);
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return api(originalRequest);
                }

                // No token received — redirect to login
                localStorage.removeItem('accessToken');
                window.location.href = '/login';
                return Promise.reject(new Error('Token refresh failed'));
            } catch (refreshError) {
                // Refresh failed — clear tokens and redirect to login
                localStorage.removeItem('accessToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
