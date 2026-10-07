import { mmkvGetJsonUserScoped, mmkvSetJson, userScopedKey } from '../../../../infrastructure/storage/mmkv';

/**
 * Coach code cache.
 *
 * Returning athletes already have a coach link in their Clerk metadata, so the
 * sign-in flow should not force them to retype the invite code. We persist the
 * code locally after first successful entry and auto-fill it on later sign-ins.
 *
 * Storage: MMKV, namespaced per user (`<base>:<userId>`). The code is cached
 * during sign-in (pre-auth), so it lands on the `:anon` key; the reader falls
 * back to `:anon` so the auto-fill survives the auth-state transition.
 * Best-effort storage: a failure must never block authentication.
 */

const COACH_CODE_KEY = 'mr_training.coachCode.v1';

export async function getCachedCoachCode(): Promise<string | null> {
  try {
    return mmkvGetJsonUserScoped<string>(COACH_CODE_KEY);
  } catch (err) {
    console.error('[coachCode] read failed:', err);
    return null;
  }
}

export function cacheCoachCode(code: string): void {
  try {
    mmkvSetJson(userScopedKey(COACH_CODE_KEY), code);
  } catch (err) {
    console.error('[coachCode] save failed:', err);
  }
}
