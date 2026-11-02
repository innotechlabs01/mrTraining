import { create } from 'zustand';
import type { ScoredQuality } from '../../ai/application/FormEngine';
import type { FormMetrics } from '../presentation/components/FormAnalyzer';

/** Outcome of a completed AI form-check session, handed back to workout execution. */
export type FormSessionResult = {
  /** Workout exercise row id the session belongs to. */
  exerciseId: string;
  /** Aggregate form score 0-100 (session average). */
  score: number;
  /** Verdict bucket derived from the score via FormEngine thresholds. */
  quality: ScoredQuality;
  metrics: FormMetrics;
};

type FormSessionState = {
  lastResult: FormSessionResult | null;
  setResult: (result: FormSessionResult) => void;
  clear: () => void;
};

/**
 * One-shot bridge between the AI workout screen and workout execution.
 * The AI flow writes its aggregate result here; execution consumes it once
 * (for the matching exercise) and the entry is cleared.
 */
export const useFormSessionStore = create<FormSessionState>((set) => ({
  lastResult: null,
  setResult: (result) => set({ lastResult: result }),
  clear: () => set({ lastResult: null }),
}));

/**
 * Consume the pending result for `exerciseId` (clears the store when matched).
 * Returns null when absent or belonging to another exercise.
 */
export function takeFormSessionResult(exerciseId: string): FormSessionResult | null {
  const { lastResult, clear } = useFormSessionStore.getState();
  if (!lastResult || lastResult.exerciseId !== exerciseId) return null;
  clear();
  return lastResult;
}
