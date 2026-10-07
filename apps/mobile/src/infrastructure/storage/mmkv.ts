/**
 * MMKV storage — fast synchronous key/value storage for caches and app state.
 *
 * react-native-mmkv v4 requires the New Architecture (enabled by default in
 * Expo SDK 54) and does NOT work in Expo Go — this app ships dev builds, so
 * that is acceptable.
 *
 * Jest safety: v4 ships a built-in in-memory mock active under JEST_WORKER_ID,
 * and the factory below still falls back to an in-memory store if the native
 * module cannot be loaded, so Node-based tests never crash.
 */
import type { MMKV } from 'react-native-mmkv';
import { getClerkInstance } from '../auth/clerk';

// Back-compat: `secureStorage` used to live here before the real MMKV split.
// Keep the export from this path so existing consumers (e.g. health sync
// timestamps in infrastructure/health) do not break.
export { secureStorage } from './secureStorage';

/** Structural subset of the MMKV API this app depends on. */
export type KeyValueStorage = Pick<
  MMKV,
  'getString' | 'set' | 'remove' | 'getAllKeys' | 'clearAll'
>;

function createInMemoryStorage(): KeyValueStorage {
  const map = new Map<string, string | number | boolean | ArrayBuffer>();
  return {
    getString: (key) => {
      const value = map.get(key);
      return typeof value === 'string' ? value : undefined;
    },
    set: (key, value) => {
      map.set(key, value);
    },
    remove: (key) => map.delete(key),
    getAllKeys: () => Array.from(map.keys()),
    clearAll: () => {
      map.clear();
    },
  };
}

function createMMKVInstance(): KeyValueStorage {
  try {
    // Lazily required (not a top-level import) so Jest/Node never evaluates
    // the native binding module chain unless it actually works there.
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    return createMMKV({ id: 'mr-training' });
  } catch (err) {
    console.warn('[storage] MMKV unavailable, using in-memory fallback:', err);
    return createInMemoryStorage();
  }
}

/** Shared app-level MMKV instance. */
export const mmkv: KeyValueStorage = createMMKVInstance();

export function mmkvSetJson(key: string, value: unknown): void {
  mmkv.set(key, JSON.stringify(value));
}

export function mmkvGetJson<T>(key: string): T | null {
  const raw = mmkv.getString(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt entry — drop it instead of throwing into callers.
    mmkv.remove(key);
    return null;
  }
}

export function mmkvRemove(key: string): void {
  mmkv.remove(key);
}

const ANON_SEGMENT = 'anon';

function currentUserId(): string | null {
  return getClerkInstance()?.user?.id ?? null;
}

/** Suffix a cache key with the current Clerk user, or 'anon' pre-auth. */
export function userScopedKey(base: string): string {
  return `${base}:${currentUserId() ?? ANON_SEGMENT}`;
}

/**
 * Read helper for user-scoped keys written before auth resolved: checks the
 * current user's key first, then the anonymous pre-auth key.
 */
export function mmkvGetJsonUserScoped<T>(base: string): T | null {
  const userKey = userScopedKey(base);
  const value = mmkvGetJson<T>(userKey);
  if (value != null) return value;
  if (!userKey.endsWith(`:${ANON_SEGMENT}`)) {
    return mmkvGetJson<T>(`${base}:${ANON_SEGMENT}`);
  }
  return null;
}

/**
 * Remove helper for user-scoped keys: removes both the current user's key and
 * the anonymous pre-auth key so flush-then-clear flows stay consistent.
 */
export function mmkvRemoveUserScoped(base: string): void {
  mmkv.remove(userScopedKey(base));
  mmkv.remove(`${base}:${ANON_SEGMENT}`);
}
