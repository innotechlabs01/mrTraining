import {
  mmkvGetJsonUserScoped,
  mmkvRemoveUserScoped,
  mmkvSetJson,
  userScopedKey,
} from '../../../../infrastructure/storage/mmkv';

/**
 * Pending onboarding payload buffer.
 *
 * When Clerk requires email verification ("Verify at sign-up" enabled), a sign-up
 * does not become `complete` immediately, so the collected 7-step onboarding data
 * would be lost. We persist it here and flush it once the user has verified and
 * the sign-up completes.
 *
 * Storage: MMKV, namespaced per user (`<base>:<userId>`). During sign-up the
 * user is not authenticated yet, so the payload lands on the `:anon` key; the
 * reader falls back to `:anon` so the post-verification flush still finds it.
 *
 * See design spec: 2026-08-21-mobile-redesign §5.5 (onboarding data visibility).
 */

export type OnboardingPayload = {
  sports: string[];
  modality: string;
  experienceLevel: string;
  goal: string;
  sessionsPerWeek: number;
  sessionDuration: number;
  equipment: string;
  athleteRoutineAccepted?: boolean;
};

const ONBOARDING_PENDING_KEY = 'mr_training.onboardingPending.v1';

export function savePendingOnboarding(payload: OnboardingPayload): void {
  // Best-effort; a storage failure must never block sign-up.
  try {
    mmkvSetJson(userScopedKey(ONBOARDING_PENDING_KEY), payload);
  } catch (err) {
    console.error('[onboardingPending] save failed:', err);
  }
}

export async function getPendingOnboarding(): Promise<OnboardingPayload | null> {
  try {
    return mmkvGetJsonUserScoped<OnboardingPayload>(ONBOARDING_PENDING_KEY);
  } catch (err) {
    console.error('[onboardingPending] read failed:', err);
    return null;
  }
}

export async function clearPendingOnboarding(): Promise<void> {
  try {
    mmkvRemoveUserScoped(ONBOARDING_PENDING_KEY);
  } catch (err) {
    console.error('[onboardingPending] clear failed:', err);
  }
}
