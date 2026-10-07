/**
 * React Query persistence backed by MMKV, namespaced per user.
 *
 * `createMMKVPersister` is not exported by @tanstack/react-query-persist-client
 * (only the core Persister interface is), so we build one against the local
 * MMKV instance. MMKV is synchronous; the Persister interface accepts
 * Promisable values, so sync implementation is valid.
 */
import type { Query } from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { mmkv, mmkvGetJson, mmkvRemove, mmkvSetJson } from './mmkv';

export const RQ_CACHE_KEY_PREFIX = 'rq-cache-';

/** Persisted cache lives 24h, same policy as the previous AsyncStorage persister. */
export const RQ_CACHE_MAX_AGE = 1000 * 60 * 60 * 24;

export function rqCacheKey(userId: string | null): string {
  return `${RQ_CACHE_KEY_PREFIX}${userId ?? 'anon'}`;
}

/**
 * Read-mostly, non-sensitive query families that are safe to keep on device.
 * Anything authentication-flow, notification, messaging or payment related is
 * intentionally excluded. Keys follow the actual queryKey root conventions in
 * src/features (see `queryKey:` usages).
 */
const PERSISTABLE_ROOT_KEYS = new Set([
  'athlete-today',
  'athlete-workouts',
  'athlete-profile',
  'athlete-store',
  'athlete-nutrition',
  'athlete-membership',
  'athlete-events',
  'athlete-challenges-v2',
  'exercises',
  'upcoming-sessions',
  'weekly-progress',
  'workout-detail',
  'workout-prescription',
]);

/** Restricts dehydration to successful, safe read-mostly queries. */
export function shouldDehydrateQuery(query: Query): boolean {
  if (query.state.status !== 'success') return false;
  const root = query.queryKey[0];
  return typeof root === 'string' && PERSISTABLE_ROOT_KEYS.has(root);
}

/** Persister bound to a single namespaced storage key (per user). */
export function createMMKVPersister(storageKey: string): Persister {
  return {
    persistClient: (client) => {
      try {
        mmkvSetJson(storageKey, client);
      } catch (err) {
        console.warn('[queryCache] persist failed:', err);
      }
    },
    restoreClient: () => mmkvGetJson<PersistedClient>(storageKey) ?? undefined,
    removeClient: () => {
      mmkvRemove(storageKey);
    },
  };
}

/** Drop every persisted query cache (all user namespaces). */
export function clearAllPersistedCaches(): void {
  const keys = mmkv.getAllKeys().filter((key) => key.startsWith(RQ_CACHE_KEY_PREFIX));
  for (const key of keys) mmkv.remove(key);
}
