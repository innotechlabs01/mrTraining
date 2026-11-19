/**
 * Go API Client — primary source for business logic endpoints.
 *
 * The Go API uses the same Clerk Bearer token for authentication.
 *
 * Routes handled by Go API (/api/v1/*):
 *   - Users: /users/me, /users/:id
 *   - Coaches: /coaches, /coaches/:id/athletes, /coaches/me
 *   - Athletes: /athletes/me
 *   - Exercises: /exercises, /exercises/:id
 *   - Workout Templates: /workout-templates, /workout-templates/:id
 *   - Workouts: /workouts, /workouts/assign, /workouts/:id/sets
 *   - Progress: /progress
 *   - Memberships: /memberships, /memberships/:id/cancel, /memberships/:id/renew
 *   - Events: /events, /events/:id, /athletes/events
 *   - Products: /products, /products/:id, /coaches/sales
 *   - Notifications: /devices, /notifications
 *   - Running: /running/sessions, /running/stats, /running/devices
 */

const GO_API_BASE = process.env.NEXT_PUBLIC_GO_API_URL || ''

interface GoRequestOptions extends RequestInit {
  auth?: boolean;
}

interface ClerkWindow {
  Clerk?: {
    session?: {
      getToken: () => Promise<string | null>;
    };
  };
}

async function getAuthToken(skipCache = false): Promise<string | null> {
  if (typeof window !== 'undefined') {
    const clerk = (window as unknown as ClerkWindow).Clerk;
    if (clerk?.session?.getToken) {
      try {
        // Clerk getToken accepts optional { skipCache?: boolean, template?: string }
        const getTokenFn = clerk.session.getToken as (options?: { skipCache?: boolean }) => Promise<string | null>;
        return await getTokenFn(skipCache ? { skipCache: true } : undefined);
      } catch {
        return null;
      }
    }
    return null;
  }
  return null;
}

/**
 * Server-side variant for Route Handlers and Server Components.
 * Accepts an explicit Clerk bearer token (resolved via `auth()` from
 * `@clerk/nextjs/server`) instead of reading it from `window.Clerk`.
 * Forwards the token as `Authorization: Bearer <token>` so Go's
 * Authenticate + TenantContext middleware can enforce RLS.
 * @param path - The API path (e.g., '/api/v1/users/me')
 * @param token - Clerk session JWT
 * @param options - Request options (method, body, headers)
 * @returns The parsed JSON response
 */
/**
 * Go API error with HTTP status code, so callers can propagate
 * the correct status (e.g. 403 Forbidden from Go stays 403 in Next.js).
 */
export class GoApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'GoApiError';
  }
}

export async function goFetchServer<T>(
  path: string,
  token: string,
  options: GoRequestOptions = {}
): Promise<T> {
  const { headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    // FormData lets the browser set the multipart boundary.
    ...(rest.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    Authorization: `Bearer ${token}`,
    ...(customHeaders as Record<string, string>),
  };

  const res = await fetch(`${GO_API_BASE}${path}`, {
    ...rest,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    let body: { error?: string | object } = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }
    const errMsg =
      typeof body.error === 'string'
        ? body.error
        : body.error != null
          ? JSON.stringify(body.error)
          : `Go API error: ${res.status}`;
    throw new GoApiError(errMsg, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/**
 * Make a request to the Go API backend.
 * Retries once on 401 with a fresh Clerk token (silent token refresh).
 * @param path - The API path (e.g., '/api/v1/users/me')
 * @param options - Request options including auth flag
 * @returns The parsed JSON response
 */
export async function goFetch<T>(path: string, options: GoRequestOptions = {}): Promise<T> {
  const { auth = true, headers: customHeaders, ...rest } = options;

  const doFetch = async (token: string | null) => {
    const headers: Record<string, string> = {
      // FormData lets the browser set the multipart boundary.
      ...(rest.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(customHeaders as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(`${GO_API_BASE}${path}`, { ...rest, headers });
  };

  if (auth) {
    // First attempt with current token
    const token = await getAuthToken();
    const response = await doFetch(token);

    if (response.status === 401 && auth) {
      // Token expired — force Clerk to refresh and retry once
      const freshToken = await getAuthToken(true);
      if (freshToken && freshToken !== token) {
        const retryResponse = await doFetch(freshToken);
        if (!retryResponse.ok) {
          const error = await retryResponse.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.error || `Go API error: ${retryResponse.status}`);
        }
        if (retryResponse.status === 204) return undefined as T;
        return retryResponse.json();
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = typeof errorData.error === 'string'
        ? errorData.error
        : errorData.message
        || errorData.detail
        || JSON.stringify(errorData)
        || `Go API error: ${response.status}`;
      throw new Error(errorMessage);
    }
    if (response.status === 204) return undefined as T;
    return response.json();
  }

  // No auth required
  const response = await doFetch(null);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Go API error: ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

/**
 * Make a request to the Go API backend and return the raw response body.
 * Use for binary/plain-text endpoints (CSV, GPX, PDF) that goFetch cannot parse as JSON.
 * Retries once on 401 with a fresh Clerk token (silent token refresh).
 */
export async function goFetchBlob(path: string, options: GoRequestOptions = {}): Promise<Blob> {
  const { auth = true, headers: customHeaders, ...rest } = options;

  const doFetch = async (token: string | null) => {
    const headers: Record<string, string> = {
      ...(rest.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(customHeaders as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(`${GO_API_BASE}${path}`, { ...rest, headers });
  };

  let response: Response;
  if (auth) {
    const token = await getAuthToken();
    response = await doFetch(token);
    if (response.status === 401) {
      const freshToken = await getAuthToken(true);
      if (freshToken && freshToken !== token) {
        response = await doFetch(freshToken);
      }
    }
  } else {
    response = await doFetch(null);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = typeof errorData.error === 'string'
      ? errorData.error
      : errorData.message || errorData.detail || `Go API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.blob();
}

/**
 * Go API client with convenience methods.
 *
 * Usage:
 *   import { goClient } from '@/lib/api/go-client'
 *   const user = await goClient.get<User>('/api/v1/users/me')
 *   const workout = await goClient.post<Workout>('/api/v1/workouts/assign', { ... })
 */
export const goClient = {
  get: <T>(path: string, options?: GoRequestOptions) =>
    goFetch<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, data: unknown, options?: GoRequestOptions) =>
    goFetch<T>(path, { ...options, method: 'POST', body: JSON.stringify(data) }),

  put: <T>(path: string, data: unknown, options?: GoRequestOptions) =>
    goFetch<T>(path, { ...options, method: 'PUT', body: JSON.stringify(data) }),

  patch: <T>(path: string, data: unknown, options?: GoRequestOptions) =>
    goFetch<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(data) }),

  delete: <T>(path: string, options?: GoRequestOptions) =>
    goFetch<T>(path, { ...options, method: 'DELETE' }),
};
