import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Coach code cache.
 *
 * Returning athletes already have a coach link in their Clerk metadata, so the
 * sign-in flow should not force them to retype the invite code. We persist the
 * code locally after first successful entry and auto-fill it on later sign-ins.
 * Best-effort storage: a failure must never block authentication.
 */

const COACH_CODE_KEY = 'mr_training.coachCode.v1';

export async function getCachedCoachCode(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(COACH_CODE_KEY);
  } catch (err) {
    console.error('[coachCode] read failed:', err);
    return null;
  }
}

export function cacheCoachCode(code: string): void {
  AsyncStorage.setItem(COACH_CODE_KEY, code).catch((err) => {
    console.error('[coachCode] save failed:', err);
  });
}