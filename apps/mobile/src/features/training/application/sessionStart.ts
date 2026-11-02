/**
 * Extracts the session id from the POST /workouts/:id/session response.
 *
 * The Go API returns the session object at the top level ({ id, workoutId, ... })
 * and NOT wrapped in { session } or { data }. This helper tolerates both shapes
 * so a future contract change does not crash the start flow again.
 */
export function extractSessionId(payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const root = payload as { id?: unknown; session?: { id?: unknown } };
    const id = root.session?.id ?? root.id;
    if (typeof id === 'string' && id.length > 0) {
      return id;
    }
  }
  throw new Error('Session response missing id');
}