import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '8080';

/**
 * Resolves the origin of the API server (no trailing slash), or '' to use relative URLs.
 *
 * Priority:
 * 1. EXPO_PUBLIC_API_URL — full URL incl. protocol (e.g. http://192.168.1.5:8080)
 * 2. EXPO_PUBLIC_DOMAIN  — hosted deployments, always https
 * 3. In development, the LAN host Metro is served from, on the API port.
 *    Without this, requests to "/api/..." hit the Metro dev server instead of the API.
 */
export function getApiOrigin(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:${API_PORT}`;
  }

  if (__DEV__) {
    const hostUri =
      Constants.expoConfig?.hostUri ??
      (Constants as any).expoGoConfig?.debuggerHost ??
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
    const host = typeof hostUri === 'string' ? hostUri.split(':')[0] : '';
    if (host) return `http://${host}:${API_PORT}`;
    return `http://localhost:${API_PORT}`;
  }

  return '';
}
