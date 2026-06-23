import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

// Tự động chuyển đổi môi trường:
// Nếu đang code/test (Development) -> dùng IP Local
// Nếu đã build app cho người dùng (Production) -> dùng server Render
const BASE_URL = __DEV__ 
    ? 'http://192.168.1.80:8080/QuanLiChiTieu'  // Local IP để test
    : 'https://paymindserver.onrender.com/QuanLiChiTieu'; // Server thật cho User

export const TOKEN_KEY = 'auth_token';

/** Save JWT token to AsyncStorage */
export const saveToken = async (token: string) => {
    console.log('[API] Saving new token');
    await AsyncStorage.setItem(TOKEN_KEY, token);
};

/** Get JWT token from AsyncStorage */
export const getToken = async (): Promise<string | null> => {
    return AsyncStorage.getItem(TOKEN_KEY);
};

/** Remove JWT token (logout) */
export const removeToken = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
};

export const getFullImageUrl = (url?: string | null) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    if (url.startsWith('uploads/')) return `${BASE_URL}/${url}`;
    if (url.startsWith('/uploads/')) return `${BASE_URL}${url}`;
    return `${BASE_URL}/uploads/${url}`;
};

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 60000,
});

// Attach Bearer token to every request automatically
api.interceptors.request.use(
    async (config) => {
        const publicEndpoints = [
            '/auth/token', '/auth/register', '/auth/verify',
            '/auth/introspect', '/auth/forgot-password', '/auth/reset-password',
            '/auth/google', '/auth/verify-reset-otp',
        ];

        // If the URL matches a public endpoint, don't attach the token
        const isPublic = publicEndpoints.some(endpoint => config.url?.includes(endpoint));

        if (!isPublic) {
            const token = await getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// Simple lock to avoid multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

const processQueue = (token: string | null) => {
    refreshQueue.forEach(callback => callback(token || ''));
    refreshQueue = [];
};

// Response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => {
        // If the response is wrapped in ApiResponse, check the code
        if (response.data && typeof response.data.code === 'number') {
            if (response.data.code !== 1000) {
                const errorMsg = response.data.message || 'Lỗi hệ thống';
                console.warn(`[API] Backend error code: ${response.data.code} - ${errorMsg}`);
                return Promise.reject(new Error(errorMsg));
            }
        }
        return response;
    },
    async (error) => {
        // Use warn instead of error to avoid triggering the full-screen RedBox in development.
        // Screen-level catch blocks should handle these errors as they see fit.
        console.warn(`[API] Response error:`, error.response?.status, error.message, error.config?.url);
        const originalRequest = error.config;

        // If error is 401 and not already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // If already refreshing, wait for it to complete
                return new Promise((resolve) => {
                    refreshQueue.push((token: string) => {
                        if (token) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            resolve(api(originalRequest));
                        } else {
                            resolve(Promise.reject(error));
                        }
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const currentToken = await getToken();
                if (currentToken) {
                    console.log('[API] Attempting token refresh...');
                    // Use global axios to avoid triggering 'api' interceptors recursively
                    const response = await axios.post(`${BASE_URL}/auth/refresh`, { token: currentToken });

                    const newToken = response.data.result?.token || response.data.token;

                    if (newToken) {
                        console.log('[API] Refresh successful');
                        await saveToken(newToken);
                        isRefreshing = false;
                        processQueue(newToken);
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return api(originalRequest);
                    } else {
                        console.warn('[API] Refresh failed: No token in response', response.data);
                    }
                }
            } catch (refreshError: any) {
                // Use warn instead of error to avoid showing RedBox in development
                // A 401 here just means the session has completely expired (e.g. >10 hours)
                console.warn('[API] Session expired or refresh failed:', refreshError.response?.status || refreshError.message);
                await removeToken();
            } finally {
                isRefreshing = false;
                processQueue(null);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
