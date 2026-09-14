import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Pending onboarding payload buffer.
 *
 * When Clerk requires email verification ("Verify at sign-up" enabled), a sign-up
 * does not become `complete` immediately, so the collected 7-step onboarding data
 * would be lost. We persist it here and flush it once the user has verified and
 * the sign-up completes.
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
  AsyncStorage.setItem(ONBOARDING_PENDING_KEY, JSON.stringify(payload)).catch((err) => {
    console.error('[onboardingPending] save failed:', err);
  });
}

export async function getPendingOnboarding(): Promise<OnboardingPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingPayload;
  } catch (err) {
    console.error('[onboardingPending] read failed:', err);
    return null;
  }
}

export async function clearPendingOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_PENDING_KEY);
  } catch (err) {
    console.error('[onboardingPending] clear failed:', err);
  }
}
