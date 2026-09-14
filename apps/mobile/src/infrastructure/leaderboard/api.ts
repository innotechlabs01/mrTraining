/**
 * Leaderboard API Client — interfaces with Go API backend for group/weekly rankings.
 */

import { smartClient as apiClient } from '../api/client';

// ─── API Response Types ───────────────────────────────────────────────────────

export interface APIGroupLeaderboard {
  id: string;
  group_id: string;
  athlete_id: string;
  athlete_name: string;
  points: number;
  rank: number;
  week_start: string;
  created_at: string;
  updated_at: string;
}

export interface APIWeeklyLeaderboard {
  rank: number;
  athlete_id: string;
  athlete_name: string;
  points: number;
  week_start: string;
}

export interface APILeaderboardHistory {
  week_start: string;
  rank: number;
  points: number;
  group_name: string;
}

// ─── API Client ───────────────────────────────────────────────────────────────

const LEADERBOARD_BASE = '/v1/leaderboard';

/**
 * Fetch group leaderboard from the API.
 */
export async function fetchGroupLeaderboard(
  groupId: string,
  week?: string,
): Promise<APIGroupLeaderboard[]> {
  try {
    const params = week ? `?week=${week}` : '';
    const response = await apiClient.get<APIGroupLeaderboard[]>(
      `${LEADERBOARD_BASE}/group/${groupId}${params}`,
    );
    return response.data ?? [];
  } catch (error) {
    console.warn('[LeaderboardAPI] fetchGroupLeaderboard failed:', error);
    return [];
  }
}

/**
 * Fetch weekly leaderboard from the API.
 */
export async function fetchWeeklyLeaderboard(
  week?: string,
  limit: number = 50,
): Promise<APIWeeklyLeaderboard[]> {
  try {
    const params = new URLSearchParams();
    if (week) params.set('week', week);
    params.set('limit', String(limit));
    const response = await apiClient.get<APIWeeklyLeaderboard[]>(
      `${LEADERBOARD_BASE}/weekly?${params.toString()}`,
    );
    return response.data ?? [];
  } catch (error) {
    console.warn('[LeaderboardAPI] fetchWeeklyLeaderboard failed:', error);
    return [];
  }
}

/**
 * Fetch user leaderboard history from the API.
 */
export async function fetchLeaderboardHistory(
  limit: number = 10,
): Promise<APILeaderboardHistory[]> {
  try {
    const response = await apiClient.get<APILeaderboardHistory[]>(
      `${LEADERBOARD_BASE}/history?limit=${limit}`,
    );
    return response.data ?? [];
  } catch (error) {
    console.warn('[LeaderboardAPI] fetchLeaderboardHistory failed:', error);
    return [];
  }
}
