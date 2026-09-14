/**
 * Gamification API Client — interfaces with Go API backend for streaks, badges, and PRs.
 * Falls back to local computation when API is unavailable.
 */

import { smartClient as apiClient } from '../api/client';

// ─── API Response Types ───────────────────────────────────────────────────────

export interface APIStreak {
  id: string;
  athlete_id: string;
  current_streak: number;
  longest_streak: number;
  last_workout_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface APIBadge {
  id: string;
  athlete_id: string;
  badge_id: string;
  unlocked_at: string;
}

export interface APIPR {
  id: string;
  athlete_id: string;
  exercise_id: string;
  exercise_name: string;
  best_value: number;
  unit: string;
  achieved_at: string;
  previous_best: number | null;
}

export interface APILogWorkoutRequest {
  workout_date: string;
  workout_type?: string;
  duration_minutes?: number;
  calories_burned?: number;
}

export interface APIRecordPRRequest {
  exercise_id: string;
  exercise_name: string;
  value: number;
  unit: string;
}

// ─── API Client ───────────────────────────────────────────────────────────────

const GAMIFICATION_BASE = '/v1/gamification';

/**
 * Fetch the athlete's streak from the API.
 */
export async function fetchStreak(): Promise<APIStreak | null> {
  try {
    const response = await apiClient.get<APIStreak>(`${GAMIFICATION_BASE}/streak`);
    return response.data;
  } catch (error) {
    console.warn('[GamificationAPI] fetchStreak failed, using local fallback:', error);
    return null;
  }
}

/**
 * Log a workout day to the API and return updated streak.
 */
export async function logWorkoutDay(data: APILogWorkoutRequest): Promise<APIStreak | null> {
  try {
    const response = await apiClient.post<APIStreak>(`${GAMIFICATION_BASE}/streak`, data);
    return response.data;
  } catch (error) {
    console.warn('[GamificationAPI] logWorkoutDay failed:', error);
    return null;
  }
}

/**
 * Fetch all badges for the athlete.
 */
export async function fetchBadges(): Promise<APIBadge[]> {
  try {
    const response = await apiClient.get<APIBadge[]>(`${GAMIFICATION_BASE}/badges`);
    return response.data ?? [];
  } catch (error) {
    console.warn('[GamificationAPI] fetchBadges failed, using local fallback:', error);
    return [];
  }
}

/**
 * Check for newly unlocked badges after a workout.
 */
export async function checkBadges(data: {
  totalWorkouts?: number;
  totalPRs?: number;
  feedInteractions?: number;
}): Promise<APIBadge[]> {
  try {
    const response = await apiClient.post<APIBadge[]>(`${GAMIFICATION_BASE}/badges`, data);
    return response.data ?? [];
  } catch (error) {
    console.warn('[GamificationAPI] checkBadges failed:', error);
    return [];
  }
}

/**
 * Fetch all PRs for the athlete.
 */
export async function fetchPRs(): Promise<APIPR[]> {
  try {
    const response = await apiClient.get<APIPR[]>(`${GAMIFICATION_BASE}/prs`);
    return response.data ?? [];
  } catch (error) {
    console.warn('[GamificationAPI] fetchPRs failed, using local fallback:', error);
    return [];
  }
}

/**
 * Record a new PR attempt via the API.
 */
export async function recordPR(data: APIRecordPRRequest): Promise<{
  pr: APIPR;
  is_new_pr: boolean;
  previous_best: number | null;
} | null> {
  try {
    const response = await apiClient.post<{
      pr: APIPR;
      is_new_pr: boolean;
      previous_best: number | null;
    }>(`${GAMIFICATION_BASE}/prs`, data);
    return response.data;
  } catch (error) {
    console.warn('[GamificationAPI] recordPR failed:', error);
    return null;
  }
}
