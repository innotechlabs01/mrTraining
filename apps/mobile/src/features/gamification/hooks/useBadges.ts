/**
 * useBadges hook — React Query integration for badge tracking.
 * Fetches from API with local fallback.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBadgesFromAPI,
  checkBadgesFromAPI,
  evaluateBadges,
  findNewBadges,
  type UserBadge,
} from '../domain/badgeService';

const BADGES_QUERY_KEY = ['gamification', 'badges'];

/**
 * Hook to fetch the athlete's unlocked badges.
 * Returns local fallback data if API unavailable.
 */
export function useBadges(stats: {
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  totalPRs: number;
  feedInteractions: number;
}) {
  return useQuery({
    queryKey: BADGES_QUERY_KEY,
    queryFn: async (): Promise<UserBadge[]> => {
      // Try API first
      const apiBadges = await fetchBadgesFromAPI();
      if (apiBadges.length > 0) return apiBadges;

      // Fallback to local evaluation
      return evaluateBadges(stats);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to check for newly unlocked badges after a workout.
 */
export function useCheckBadges() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stats: {
      totalWorkouts: number;
      totalPRs: number;
      feedInteractions: number;
    }): Promise<UserBadge[]> => {
      // Try API first
      const apiBadges = await checkBadgesFromAPI(stats);
      if (apiBadges.length > 0) return apiBadges;

      // Fallback: evaluate locally (needs current streak from query cache)
      const streakData = queryClient.getQueryData<{ current: number; longest: number }>(
        ['gamification', 'streak'],
      );
      return evaluateBadges({
        currentStreak: streakData?.current ?? 0,
        longestStreak: streakData?.longest ?? 0,
        ...stats,
      });
    },
    onSuccess: () => {
      // Invalidate badges query to refetch
      queryClient.invalidateQueries({ queryKey: BADGES_QUERY_KEY });
    },
  });
}

/**
 * Helper to find newly unlocked badges from a check result.
 */
export function useNewBadges(currentUnlocked: UserBadge[], previouslyUnlocked: UserBadge[]) {
  return findNewBadges(currentUnlocked, previouslyUnlocked);
}
