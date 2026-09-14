import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local workout-session resume buffer.
 *
 * A workout is walked one set at a time. If the app is killed mid-session (or the
 * user backgrounds it), we persist the current exercise/set position here and offer
 * to "Reanudar" on the next launch, keyed to the same session id.
 *
 * Mirrors the onboardingPending buffer pattern. See plan:
 * 2026-08-21-mobile-redesign-phase-c1, Task 6 (per-set logging + resume).
 */

export type SessionResume = {
  sessionId: string;
  currentExerciseIndex: number;
  currentSetIndex: number;
};

const RESUME_KEY = 'mr_training.workoutSession.v1';

export function saveSessionResume(
  sessionId: string,
  currentExerciseIndex: number,
  currentSetIndex: number,
): void {
  const payload: SessionResume = { sessionId, currentExerciseIndex, currentSetIndex };
  // Best-effort; a storage failure must never block progressing a workout.
  AsyncStorage.setItem(RESUME_KEY, JSON.stringify(payload)).catch((err) => {
    console.error('[executionResume] save failed:', err);
  });
}

export async function getSessionResume(): Promise<SessionResume | null> {
  try {
    const raw = await AsyncStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionResume;
  } catch (err) {
    console.error('[executionResume] read failed:', err);
    return null;
  }
}

export async function clearSessionResume(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RESUME_KEY);
  } catch (err) {
    console.error('[executionResume] clear failed:', err);
  }
}
