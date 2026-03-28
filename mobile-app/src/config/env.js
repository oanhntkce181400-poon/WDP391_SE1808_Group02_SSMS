import { Platform } from 'react-native';

const DEFAULT_SERVER_ORIGIN =
  Platform.OS === 'web' ? 'http://localhost:3000' : 'http://10.0.2.2:3000';
const RAW_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const RAW_SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL;
const RAW_GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const RAW_GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const RAW_GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const RAW_GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const RAW_GOOGLE_REDIRECT_SCHEME = process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_SCHEME;

function trimTrailingSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function normalizeEnvValue(value) {
  return String(value || '').trim();
}

function firstNonEmpty(...values) {
  return values.find((value) => String(value || '').trim().length > 0) || '';
}

/**
 * Expo automatically exposes variables prefixed with `EXPO_PUBLIC_` from the
 * mobile app's `.env` file. Centralising resolution here keeps API and socket
 * clients consistent and gives the app one fallback policy when the env file is
 * missing or incomplete.
 */
function resolveServerOrigin() {
  const envSocketUrl = trimTrailingSlash(RAW_SOCKET_URL);
  if (envSocketUrl) {
    return envSocketUrl;
  }

  const envApiBaseUrl = trimTrailingSlash(RAW_API_BASE_URL);
  if (envApiBaseUrl) {
    return envApiBaseUrl.replace(/\/api$/i, '');
  }

  return DEFAULT_SERVER_ORIGIN;
}

function resolveApiBaseUrl() {
  const envApiBaseUrl = trimTrailingSlash(RAW_API_BASE_URL);
  if (envApiBaseUrl) {
    return envApiBaseUrl;
  }

  return `${resolveServerOrigin()}/api`;
}

const GENERIC_GOOGLE_CLIENT_ID = normalizeEnvValue(RAW_GOOGLE_CLIENT_ID);
export const GOOGLE_WEB_CLIENT_ID = firstNonEmpty(
  normalizeEnvValue(RAW_GOOGLE_WEB_CLIENT_ID),
  GENERIC_GOOGLE_CLIENT_ID,
);
// Native Android/iOS builds need their own OAuth client IDs. The generic/web
// client ID remains as a backward-compatible fallback for web only.
export const GOOGLE_ANDROID_CLIENT_ID = normalizeEnvValue(RAW_GOOGLE_ANDROID_CLIENT_ID);
export const GOOGLE_IOS_CLIENT_ID = normalizeEnvValue(RAW_GOOGLE_IOS_CLIENT_ID);
export const GOOGLE_REDIRECT_SCHEME = firstNonEmpty(
  normalizeEnvValue(RAW_GOOGLE_REDIRECT_SCHEME),
  'com.wdp391.ssmsmobile',
);

export function getGoogleAuthConfig(platform = Platform.OS) {
  const normalizedPlatform = String(platform || Platform.OS).toLowerCase();
  const sharedConfig = {
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    ...(normalizedPlatform === 'web'
      ? {}
      : {
          // Google native OAuth redirect URIs use the custom scheme with a single slash.
          redirectUri: `${GOOGLE_REDIRECT_SCHEME}:/oauthredirect`,
        }),
  };

  if (normalizedPlatform === 'android') {
    return {
      ...sharedConfig,
      androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    };
  }

  if (normalizedPlatform === 'ios') {
    return {
      ...sharedConfig,
      iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    };
  }

  return sharedConfig;
}

export function isGoogleLoginConfigured(platform = Platform.OS) {
  const normalizedPlatform = String(platform || Platform.OS).toLowerCase();
  if (normalizedPlatform === 'android') return Boolean(GOOGLE_ANDROID_CLIENT_ID);
  if (normalizedPlatform === 'ios') return Boolean(GOOGLE_IOS_CLIENT_ID);
  return Boolean(GOOGLE_WEB_CLIENT_ID);
}

export function getGoogleLoginMissingEnvMessage(platform = Platform.OS) {
  const normalizedPlatform = String(platform || Platform.OS).toLowerCase();

  if (normalizedPlatform === 'android') {
    return 'Missing EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID in mobile .env. Native Android Google login also needs the matching GOOGLE_ANDROID_CLIENT_ID on the backend.';
  }

  if (normalizedPlatform === 'ios') {
    return 'Missing EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID in mobile .env. Native iOS Google login also needs the matching GOOGLE_IOS_CLIENT_ID on the backend.';
  }

  return 'Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID or EXPO_PUBLIC_GOOGLE_CLIENT_ID in mobile .env.';
}

export const SERVER_ORIGIN = resolveServerOrigin();
export const API_BASE_URL = resolveApiBaseUrl();
export const SOCKET_URL = SERVER_ORIGIN;
export const ENV_FILE_NAME = '.env';
