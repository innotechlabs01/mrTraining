/**
 * useLeaderboard hook — React Query integration for leaderboard data.
 */

import { useQuery } from '@tanstack/react-query';

import {
  fetchGroupLeaderboard,
  fetchWeeklyLeaderboard,
  fetchLeaderboardHistory,
  type APIGroupLeaderboard,
  type APIWeeklyLeaderboard,
  type APILeaderboardHistory,
} from '../../../infrastructure/leaderboard/api';

const LEADERBOARD_QUERY_KEY = ['gamification', 'leaderboard'];

/**
 * Hook to fetch group leaderboard.
 */
export function useGroupLeaderboard(groupId: string, week?: string) {
  return useQuery({
    queryKey: [...LEADERBOARD_QUERY_KEY, 'group', groupId, week],
    queryFn: () => fetchGroupLeaderboard(groupId, week),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!groupId,
  });
}

/**
 * Hook to fetch weekly leaderboard.
 */
export function useWeeklyLeaderboard(week?: string, limit: number = 50) {
  return useQuery({
    queryKey: [...LEADERBOARD_QUERY_KEY, 'weekly', week, limit],
    queryFn: () => fetchWeeklyLeaderboard(week, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch user leaderboard history.
 */
export function useLeaderboardHistory(limit: number = 10) {
  return useQuery({
    queryKey: [...LEADERBOARD_QUERY_KEY, 'history', limit],
    queryFn: () => fetchLeaderboardHistory(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
