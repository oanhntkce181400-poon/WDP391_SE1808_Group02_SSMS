import { Platform } from 'react-native';

const DEFAULT_SERVER_ORIGIN =
  Platform.OS === 'web' ? 'http://localhost:3000' : 'http://10.0.2.2:3000';

function trimTrailingSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

/**
 * Expo automatically exposes variables prefixed with `EXPO_PUBLIC_` from the
 * mobile app's `.env` file. Centralising resolution here keeps API and socket
 * clients consistent and gives the app one fallback policy when the env file is
 * missing or incomplete.
 */
function resolveServerOrigin() {
  const envSocketUrl = trimTrailingSlash(process.env.EXPO_PUBLIC_SOCKET_URL);
  if (envSocketUrl) {
    return envSocketUrl;
  }

  const envApiBaseUrl = trimTrailingSlash(process.env.EXPO_PUBLIC_API_BASE_URL);
  if (envApiBaseUrl) {
    return envApiBaseUrl.replace(/\/api$/i, '');
  }

  return DEFAULT_SERVER_ORIGIN;
}

function resolveApiBaseUrl() {
  const envApiBaseUrl = trimTrailingSlash(process.env.EXPO_PUBLIC_API_BASE_URL);
  if (envApiBaseUrl) {
    return envApiBaseUrl;
  }

  return `${resolveServerOrigin()}/api`;
}

export const SERVER_ORIGIN = resolveServerOrigin();
export const API_BASE_URL = resolveApiBaseUrl();
export const SOCKET_URL = SERVER_ORIGIN;
export const ENV_FILE_NAME = '.env';
