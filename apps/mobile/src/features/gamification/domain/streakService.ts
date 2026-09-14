/**
 * Streak Tracking Service — tracks consecutive workout days.
 * Medium gamification: streaks + badges + PRs + weekly challenges.
 *
 * Works with local date strings (YYYY-MM-DD) to avoid timezone drift.
 * Syncs with Go API backend when available, falls back to local computation.
 */

import {
  fetchStreak as apiFetchStreak,
  logWorkoutDay as apiLogWorkoutDay,
  type APIStreak,
} from '../../../infrastructure/gamification/api';

export interface StreakData {
  /** Current consecutive days with at least one workout */
  current: number;
  /** Longest streak ever achieved */
  longest: number;
  /** ISO date strings (YYYY-MM-DD) of the last N workout days */
  recentDays: string[];
  /** Whether the user has worked out today */
  completedToday: boolean;
}

/** Format a Date to YYYY-MM-DD in local time (no timezone offset). */
export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD back to a Date at local midnight. */
export function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Add 1 day to a local date string. */
function addDay(dateStr: string): string {
  const dt = parseLocalDate(dateStr);
  dt.setDate(dt.getDate() + 1);
  return toLocalDateStr(dt);
}

/** Subtract 1 day from a local date string. */
function subDay(dateStr: string): string {
  const dt = parseLocalDate(dateStr);
  dt.setDate(dt.getDate() - 1);
  return toLocalDateStr(dt);
}

/**
 * Calculate streak data from a sorted (ascending) list of unique workout date strings.
 * Input MUST be deduplicated and sorted ascending.
 */
export function calculateStreak(sortedUniqueDays: string[]): StreakData {
  if (sortedUniqueDays.length === 0) {
    return { current: 0, longest: 0, recentDays: [], completedToday: false };
  }

  const today = toLocalDateStr(new Date());
  const completedToday = sortedUniqueDays[sortedUniqueDays.length - 1] === today;

  // Calculate longest streak (scan all gaps)
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sortedUniqueDays.length; i++) {
    if (sortedUniqueDays[i] === addDay(sortedUniqueDays[i - 1])) {
      run++;
    } else {
      longest = Math.max(longest, run);
      run = 1;
    }
  }
  longest = Math.max(longest, run);

  // Calculate current streak: count backwards from today (or yesterday if today not done)
  let current = 0;
  let cursor = completedToday ? today : subDay(today);
  // Walk backwards from cursor
  const daySet = new Set(sortedUniqueDays);
  while (daySet.has(cursor)) {
    current++;
    cursor = subDay(cursor);
  }

  return {
    current,
    longest,
    recentDays: sortedUniqueDays.slice(-30), // last 30 days
    completedToday,
  };
}

/**
 * Merge a new workout date into an existing sorted list of dates.
 * Returns a new deduplicated, sorted array.
 */
export function mergeWorkoutDate(existing: string[], newDate: string): string[] {
  const set = new Set(existing);
  set.add(newDate);
  return Array.from(set).sort();
}

// ─── API-Synced Functions ─────────────────────────────────────────────────────

/**
 * Fetch streak from API, converting to local StreakData format.
 * Returns null if API is unavailable (caller should use local fallback).
 */
export async function fetchStreakFromAPI(): Promise<StreakData | null> {
  const apiStreak = await apiFetchStreak();
  if (!apiStreak) return null;

  return {
    current: apiStreak.current_streak,
    longest: apiStreak.longest_streak,
    recentDays: [], // API doesn't return full history, local tracks this
    completedToday: apiStreak.last_workout_date === toLocalDateStr(new Date()),
  };
}

/**
 * Log a workout day via API, returning updated streak.
 * Falls back to local computation if API unavailable.
 */
export async function logWorkoutDayToAPI(
  workoutDate: string,
  workoutType?: string,
  durationMinutes?: number,
  caloriesBurned?: number,
): Promise<StreakData | null> {
  const apiStreak = await apiLogWorkoutDay({
    workout_date: workoutDate,
    workout_type: workoutType,
    duration_minutes: durationMinutes,
    calories_burned: caloriesBurned,
  });

  if (!apiStreak) return null;

  return {
    current: apiStreak.current_streak,
    longest: apiStreak.longest_streak,
    recentDays: [],
    completedToday: apiStreak.last_workout_date === toLocalDateStr(new Date()),
  };
}
