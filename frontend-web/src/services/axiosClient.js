import axios from 'axios';

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

    const isAuthRoute = String(originalRequest.url || '').includes('/auth/');
    if (status !== 401 || isAuthRoute) {
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
      await axiosClient.post('/auth/refresh');
      retryQueue();
      return axiosClient(originalRequest);
    } catch (refreshError) {
      resolveQueue(refreshError);
      throw refreshError;
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosClient;
