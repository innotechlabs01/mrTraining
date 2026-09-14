import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getClerkToken } from '../auth/clerk';
import Constants from 'expo-constants';

// Backend authority: Go API (apps/api) is the SINGLE source of truth.
// All business logic goes through Go API (/api/v1/*).
// Next.js only for webhooks/SSR when needed.
const GO_API_URL: string = Constants.expoConfig?.extra?.goApiUrl ?? 'http://localhost:8080';
const NEXT_API_URL: string = Constants.expoConfig?.extra?.apiBaseUrl ?? '';

// Path mapping: mobile paths → Go API paths
// Go API uses different route structure than the old Next.js backend
const GO_API_PATH_MAP: Record<string, string> = {
  '/athlete/today': '/athletes/today',
  '/athlete/profile': '/users/me',
  '/athlete/onboard': '/athletes/onboard',
  '/athlete/accept-invite': '/invites/accept',
  '/athlete/health/metrics': '/health/metrics',
  '/athlete/health/sleep': '/health/sleep',
  '/athlete/health/devices': '/health/devices',
  '/athlete/workouts': '/workouts',
  '/athlete/sessions': '/training/sessions',
  '/athlete/events': '/athletes/events',
  '/athlete/membership': '/memberships',
  '/athlete/notifications': '/notifications',
  '/athlete/push-tokens': '/devices',
};

// Paths that stay in Next.js (not in Go API)
// All main endpoints are now in Go API
const NEXTJS_ONLY_PATHS: string[] = [];

/**
 * Transform mobile path to Go API path.
 * If path is in NEXTJS_ONLY, returns null (use nextClient).
 */
function toGoApiPath(path: string): string | null {
  // Check if this is a Next.js-only path
  if (NEXTJS_ONLY_PATHS.some(p => path.startsWith(p))) {
    return null;
  }
  // Check exact match first
  if (GO_API_PATH_MAP[path]) {
    return GO_API_PATH_MAP[path];
  }
  // Check prefix match (for paths with query params or IDs)
  for (const [mobilePath, goPath] of Object.entries(GO_API_PATH_MAP)) {
    if (path.startsWith(mobilePath + '/') || path.startsWith(mobilePath + '?')) {
      return path.replace(mobilePath, goPath);
    }
  }
  // Default: use path as-is (for paths that are the same in both)
  return path;
}

/**
 * Primary API client → Go API backend (`/api/v1/*`).
 * This is the single source of truth for all data.
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: `${GO_API_URL}/api/v1`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Secondary client → Next.js backend. Only for webhooks and SSR endpoints
 * that are NOT available in Go API.
 */
const nextClient: AxiosInstance = axios.create({
  baseURL: `${NEXT_API_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Smart API client that routes to Go API or Next.js based on path.
 * Uses AxiosInstance directly by intercepting at the instance level.
 */
function createSmartInstance(): AxiosInstance {
  const instance = axios.create({
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  });

  // Apply auth interceptor
  setupAuthInterceptor(instance);

  // Override request to route to correct backend
  instance.interceptors.request.use(async (config) => {
    const originalUrl = config.url || '';
    const goPath = toGoApiPath(originalUrl);

    if (goPath !== null) {
      // Route to Go API
      config.baseURL = `${GO_API_URL}/api/v1`;
      config.url = goPath;
    } else {
      // Route to Next.js
      config.baseURL = `${NEXT_API_URL}/api`;
      config.url = originalUrl;
    }

    return config;
  });

  return instance;
}

const smartClient = createSmartInstance();

// Shared auth interceptor for both clients
const setupAuthInterceptor = (client: AxiosInstance) => {
  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await getClerkToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        // Try to get a fresh token and retry once
        const token = await getClerkToken();
        if (token && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        }

        // Token refresh failed — caller should handle redirect to auth
      }

      return Promise.reject(error);
    },
  );
};

// Apply auth interceptors to both clients
setupAuthInterceptor(apiClient);
setupAuthInterceptor(nextClient);

export { apiClient, nextClient, smartClient };
