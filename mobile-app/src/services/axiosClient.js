// Axios client for mobile app (with refresh token)
import axios from 'axios';
import { API_BASE_URL } from '../config/env';
import useAuthStore from '../stores/useAuthStore';
import { AUTH_STORAGE_KEY, removeItem, setItem } from '../utils/storage';

console.log('[AxiosClient] Initializing with API_BASE_URL:', API_BASE_URL);

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

function isAuthTokenError(error) {
  const status = error?.response?.status;
  const message = String(error?.response?.data?.message || '').toLowerCase();

  if (status !== 401) return false;

  return (
    message.includes('jwt expired') ||
    message.includes('token expired') ||
    message.includes('invalid access token') ||
    message.includes('missing access token')
  );
}

async function tryRefreshAccessToken() {
  const state = useAuthStore.getState();
  const currentRefreshToken = state.refreshToken;

  if (!currentRefreshToken) {
    throw new Error('No refresh token');
  }

  const response = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken: currentRefreshToken },
    { withCredentials: true },
  );

  const newAccessToken = response?.data?.tokens?.accessToken;
  const newRefreshToken = response?.data?.tokens?.refreshToken || currentRefreshToken;
  const nextUser = response?.data?.user || state.user || null;

  if (!newAccessToken) {
    throw new Error('Refresh did not return access token');
  }

  const authPayload = {
    user: nextUser,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };

  state.setAuth(authPayload);
  await setItem(AUTH_STORAGE_KEY, authPayload);

  return newAccessToken;
}

axiosClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`[AxiosClient] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
});

axiosClient.interceptors.response.use(
  (response) => {
    console.log(`[AxiosClient] Response OK: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    console.log('[AxiosClient] Error:', error.message, 'URL:', error.config?.url);
    const originalRequest = error?.config || {};
    const requestUrl = String(originalRequest?.url || '');
    const isRefreshRequest = requestUrl.includes('/auth/refresh');

    if (isAuthTokenError(error) && !isRefreshRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await tryRefreshAccessToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      } catch {
        // Fallback to forced logout below.
      }
    }

    if (isAuthTokenError(error) || isRefreshRequest) {
      useAuthStore.getState().logout();
      await removeItem(AUTH_STORAGE_KEY);
    }

    throw error;
  },
);

export default axiosClient;
