import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getClerkToken, refreshClerkToken } from '../auth/clerk';
import Constants from 'expo-constants';

// Backend authority: Go API (apps/api) is the SINGLE source of truth.
// All business logic goes through Go API (/api/v1/*).
// Next.js only for webhooks/SSR when needed.
// Priority: EXPO_PUBLIC_GO_API_URL (per-environment, set in eas.json env /
// .env) > app.json extra.goApiUrl (dev LAN default) > localhost. Production
// builds MUST define EXPO_PUBLIC_GO_API_URL — the LAN IP in app.json is only
// reachable on the developer's network.
const GO_API_URL: string =
  process.env.EXPO_PUBLIC_GO_API_URL ??
  Constants.expoConfig?.extra?.goApiUrl ??
  'http://localhost:9090';
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
  '/athlete/sessions': '/athletes/sessions',
  '/athlete/events': '/athletes/events',
  '/athlete/membership': '/memberships',
  '/athlete/notifications': '/notifications',
  '/athlete/push-tokens': '/devices',
  '/athlete/tickets': '/athlete/tickets',
  '/athlete/tickets/create': '/athlete/tickets',
  '/tickets': '/tickets',
  '/tickets/:id': '/tickets/:id',
  '/tickets/:id/messages': '/tickets/:id/messages',
  '/tickets/:id/read': '/tickets/:id/read',
  '/tickets/:id/unread': '/tickets/:id/unread',
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
  // Fail fast: 8s (was 15s) so users get an error/retry prompt quickly on bad
  // networks instead of a frozen screen. React Query handles the retries.
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Secondary client → Next.js backend. Only for webhooks and SSR endpoints
 * that are NOT available in Go API.
 */
const nextClient: AxiosInstance = axios.create({
  baseURL: `${NEXT_API_URL}/api`,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

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
    (response: AxiosResponse) => {
      // Go API list endpoints wrap payloads in ListResponse:
      //   { data: T[], total: number, page: number, limit: number }
      // Consumers expect the bare array, so unwrap it centrally. Strict shape
      // check (array data + numeric total + page) so single-object responses
      // that merely carry a `data` field are left untouched.
      const d = response.data as unknown;
      if (
        d !== null &&
        typeof d === 'object' &&
        !Array.isArray(d) &&
        'data' in d &&
        Array.isArray((d as { data?: unknown }).data) &&
        'total' in d &&
        typeof (d as { total?: unknown }).total === 'number' &&
        'page' in d
      ) {
        response.data = (d as { data: unknown[] }).data;
      }
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        // Extract the failed token from the Authorization header to compare
        // with the fresh token. Only retry if the token actually changed
        // (mirrors web guard at apps/web/src/lib/api/go-client.ts:81-90).
        const failedAuthHeader = originalRequest.headers?.Authorization;
        const failedToken =
          typeof failedAuthHeader === 'string'
            ? failedAuthHeader.replace('Bearer ', '')
            : '';

        const freshToken = await refreshClerkToken();
        if (freshToken && freshToken !== failedToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          // If this retry still returns 401, _retry is set — we reject, no loop.
          return client(originalRequest);
        }

        // Token refresh failed or returned same token — caller should handle redirect to auth
      }

      return Promise.reject(error);
    },
  );
};

/**
 * Smart API client that routes to Go API or Next.js based on path.
 * Uses AxiosInstance directly by intercepting at the instance level.
 */
function createSmartInstance(): AxiosInstance {
  const instance = axios.create({
    timeout: 8000,
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

// Apply auth interceptors to both clients
setupAuthInterceptor(apiClient);
setupAuthInterceptor(nextClient);

const smartClient = createSmartInstance();

export { apiClient, nextClient, smartClient };
