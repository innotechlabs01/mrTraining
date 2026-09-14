/**
 * PR (Personal Record) Tracking Service — tracks best lifts and performances per exercise.
 * Medium gamification: streaks + badges + PRs + weekly challenges + group leaderboards.
 *
 * Syncs with Go API backend when available, falls back to local evaluation.
 */

import {
  fetchPRs as apiFetchPRs,
  recordPR as apiRecordPR,
  type APIPR,
} from '../../../infrastructure/gamification/api';

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  /** Best value achieved (weight in kg, reps, distance in km, duration in seconds) */
  bestValue: number;
  unit: 'kg' | 'reps' | 'km' | 'sec';
  /** When the PR was set */
  achievedAt: string; // ISO date
  /** Optional: previous best before this PR */
  previousBest?: number;
}

export interface PRAttempt {
  exerciseId: string;
  exerciseName: string;
  value: number;
  unit: 'kg' | 'reps' | 'km' | 'sec';
  attemptedAt: string; // ISO date
}

export interface PRComparison {
  exerciseId: string;
  isNewPR: boolean;
  previousBest: number | null;
  newBest: number;
  improvement: number | null; // absolute difference
  improvementPercent: number | null;
  unit: string;
}

/**
 * Evaluate an attempt against existing PRs.
 * Returns a comparison for each exercise in the attempt.
 */
export function evaluateAttempt(
  attempt: PRAttempt,
  existingPRs: PersonalRecord[],
): PRComparison {
  const existing = existingPRs.find((pr) => pr.exerciseId === attempt.exerciseId);

  if (!existing) {
    return {
      exerciseId: attempt.exerciseId,
      isNewPR: true,
      previousBest: null,
      newBest: attempt.value,
      improvement: null,
      improvementPercent: null,
      unit: attempt.unit,
    };
  }

  const isNew = attempt.value > existing.bestValue;
  const improvement = isNew ? attempt.value - existing.bestValue : null;
  const improvementPercent =
    isNew && existing.bestValue > 0
      ? ((attempt.value - existing.bestValue) / existing.bestValue) * 100
      : null;

  return {
    exerciseId: attempt.exerciseId,
    isNewPR: isNew,
    previousBest: existing.bestValue,
    newBest: isNew ? attempt.value : existing.bestValue,
    improvement,
    improvementPercent,
    unit: attempt.unit,
  };
}

/**
 * Update the PR list with a new attempt if it's a new record.
 * Returns the updated list (new array, immutable).
 */
export function updatePRs(
  existingPRs: PersonalRecord[],
  attempt: PRAttempt,
): PersonalRecord[] {
  const comparison = evaluateAttempt(attempt, existingPRs);

  if (!comparison.isNewPR) {
    return existingPRs;
  }

  const filtered = existingPRs.filter((pr) => pr.exerciseId !== attempt.exerciseId);
  const newPR: PersonalRecord = {
    exerciseId: attempt.exerciseId,
    exerciseName: attempt.exerciseName,
    bestValue: attempt.value,
    unit: attempt.unit,
    achievedAt: attempt.attemptedAt,
    previousBest: comparison.previousBest ?? undefined,
  };

  return [...filtered, newPR];
}

/**
 * Format a PR value for display.
 */
export function formatPRValue(value: number, unit: string): string {
  switch (unit) {
    case 'kg':
      return `${value} kg`;
    case 'reps':
      return `${value} reps`;
    case 'km':
      return `${value.toFixed(2)} km`;
    case 'sec': {
      const min = Math.floor(value / 60);
      const sec = value % 60;
      return min > 0 ? `${min}:${String(sec).padStart(2, '0')}` : `${sec}s`;
    }
    default:
      return String(value);
  }
}

/**
 * Count total PRs across all exercises.
 */
export function countTotalPRs(prs: PersonalRecord[]): number {
  return prs.length;
}

// ─── API-Synced Functions ─────────────────────────────────────────────────────

/**
 * Fetch PRs from API, converting to local PersonalRecord format.
 * Returns empty array if API unavailable (caller should use local fallback).
 */
export async function fetchPRsFromAPI(): Promise<PersonalRecord[]> {
  const apiPRs = await apiFetchPRs();
  if (apiPRs.length === 0) return [];

  return apiPRs.map((pr) => ({
    exerciseId: pr.exercise_id,
    exerciseName: pr.exercise_name,
    bestValue: pr.best_value,
    unit: pr.unit as PersonalRecord['unit'],
    achievedAt: pr.achieved_at,
    previousBest: pr.previous_best ?? undefined,
  }));
}

/**
 * Record a PR via API, returning comparison and updated record.
 * Returns null if API unavailable (caller should use local fallback).
 */
export async function recordPRToAPI(attempt: PRAttempt): Promise<{
  pr: PersonalRecord;
  isNewPR: boolean;
} | null> {
  const result = await apiRecordPR({
    exercise_id: attempt.exerciseId,
    exercise_name: attempt.exerciseName,
    value: attempt.value,
    unit: attempt.unit,
  });

  if (!result) return null;

  return {
    pr: {
      exerciseId: result.pr.exercise_id,
      exerciseName: result.pr.exercise_name,
      bestValue: result.pr.best_value,
      unit: result.pr.unit as PersonalRecord['unit'],
      achievedAt: result.pr.achieved_at,
      previousBest: result.pr.previous_best ?? undefined,
    },
    isNewPR: result.is_new_pr,
  };
}
