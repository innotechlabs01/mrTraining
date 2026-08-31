/**
 * Go API Client — primary source for business logic endpoints.
 *
 * This client calls the Go backend at NEXT_PUBLIC_GO_API_URL (default: http://localhost:8080).
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

const GO_API_BASE = process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:8080'

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

async function getAuthToken(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    const clerk = (window as unknown as ClerkWindow).Clerk;
    if (clerk?.session?.getToken) {
      try {
        return await clerk.session.getToken();
      } catch {
        return null;
      }
    }
    return localStorage.getItem('mr-training-auth-token');
  }
  return null;
}

/**
 * Make a request to the Go API backend.
 * @param path - The API path (e.g., '/api/v1/users/me')
 * @param options - Request options including auth flag
 * @returns The parsed JSON response
 */
export async function goFetch<T>(path: string, options: GoRequestOptions = {}): Promise<T> {
  const { auth = true, headers: customHeaders, ...rest } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (auth) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${GO_API_BASE}${path}`, {
    ...rest,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Go API error: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
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
