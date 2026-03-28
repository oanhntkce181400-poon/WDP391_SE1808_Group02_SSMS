import axios from 'axios';
import { clearAuthSessionStorage, storeAuthSession } from '../utils/authStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const axiosClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
});

// Add request interceptor to include access token from localStorage
axiosClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let pendingQueue = [];

function shouldSkipRefreshRetry(url) {
  const normalizedUrl = String(url || '');
  return [
    '/auth/login',
    '/auth/google',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
  ].some((path) => normalizedUrl.includes(path));
}

function resolveQueue(error) {
  pendingQueue.forEach(({ reject }) => reject(error));
  pendingQueue = [];
}

function retryQueue() {
  pendingQueue.forEach(({ resolve }) => resolve());
  pendingQueue = [];
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;

    if (!originalRequest || originalRequest._retry) {
      throw error;
    }

    if (status !== 401 || shouldSkipRefreshRetry(originalRequest.url)) {
      throw error;
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: () => resolve(axiosClient(originalRequest)),
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshResponse = await axiosClient.post('/auth/refresh');
      storeAuthSession({
        user: refreshResponse?.data?.user,
        accessToken: refreshResponse?.data?.tokens?.accessToken,
      });
      retryQueue();
      return axiosClient(originalRequest);
    } catch (refreshError) {
      clearAuthSessionStorage();
      resolveQueue(refreshError);
      throw refreshError;
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosClient;
