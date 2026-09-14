/**
 * Video Analytics API Client — interfaces with Go API backend for exercise form tracking.
 */

import { smartClient as apiClient } from '../api/client';

// ─── API Response Types ───────────────────────────────────────────────────────

export interface APISessionAnalysis {
  id: string;
  athlete_id: string;
  workout_id: string;
  exercise_id: string;
  exercise_name: string;
  duration_sec: number;
  rep_count: number;
  avg_form_score: number;
  min_form_score: number;
  max_form_score: number;
  video_url: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface APIExerciseAnalytics {
  exercise_id: string;
  exercise_name: string;
  total_sessions: number;
  total_reps: number;
  avg_form_score: number;
  best_form_score: number;
  avg_duration: number;
}

export interface APIAnalyticsSummary {
  total_sessions: number;
  total_reps: number;
  avg_form_score: number;
  total_duration_min: number;
  exercise_count: number;
}

// ─── API Client ───────────────────────────────────────────────────────────────

const VIDEO_ANALYTICS_BASE = '/v1/video-analytics';

/**
 * Track a new video analysis session via the API.
 */
export async function trackSession(data: {
  workout_id?: string;
  exercise_id: string;
  exercise_name: string;
  duration_sec: number;
  rep_count: number;
  avg_form_score: number;
  min_form_score: number;
  max_form_score: number;
  video_url?: string;
}): Promise<APISessionAnalysis | null> {
  try {
    const response = await apiClient.post<APISessionAnalysis>(`${VIDEO_ANALYTICS_BASE}/track`, data);
    return response.data;
  } catch (error) {
    console.warn('[VideoAnalyticsAPI] trackSession failed:', error);
    return null;
  }
}

/**
 * Fetch analytics summary from the API.
 */
export async function fetchSummary(): Promise<APIAnalyticsSummary | null> {
  try {
    const response = await apiClient.get<APIAnalyticsSummary>(`${VIDEO_ANALYTICS_BASE}/summary`);
    return response.data;
  } catch (error) {
    console.warn('[VideoAnalyticsAPI] fetchSummary failed:', error);
    return null;
  }
}

/**
 * Fetch per-exercise analytics from the API.
 */
export async function fetchPerExercise(): Promise<APIExerciseAnalytics[]> {
  try {
    const response = await apiClient.get<APIExerciseAnalytics[]>(`${VIDEO_ANALYTICS_BASE}/per-exercise`);
    return response.data ?? [];
  } catch (error) {
    console.warn('[VideoAnalyticsAPI] fetchPerExercise failed:', error);
    return [];
  }
}

/**
 * Fetch sessions from the API.
 */
export async function fetchSessions(
  limit: number = 20,
  offset: number = 0,
): Promise<APISessionAnalysis[]> {
  try {
    const response = await apiClient.get<APISessionAnalysis[]>(
      `${VIDEO_ANALYTICS_BASE}/sessions?limit=${limit}&offset=${offset}`,
    );
    return response.data ?? [];
  } catch (error) {
    console.warn('[VideoAnalyticsAPI] fetchSessions failed:', error);
    return [];
  }
}
