/**
 * useStreak hook — React Query integration for streak tracking.
 * Fetches from API with local fallback.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchStreakFromAPI,
  logWorkoutDayToAPI,
  calculateStreak,
  mergeWorkoutDate,
  type StreakData,
} from '../domain/streakService';

const STREAK_QUERY_KEY = ['gamification', 'streak'];

/**
 * Hook to fetch the athlete's current streak.
 * Returns local fallback data if API unavailable.
 */
export function useStreak(workoutDays: string[] = []) {
  return useQuery({
    queryKey: STREAK_QUERY_KEY,
    queryFn: async (): Promise<StreakData> => {
      // Try API first
      const apiStreak = await fetchStreakFromAPI();
      if (apiStreak) return apiStreak;

      // Fallback to local computation
      return calculateStreak(workoutDays);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to log a workout day and update streak.
 */
export function useLogWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workoutDate: string;
      workoutType?: string;
      durationMinutes?: number;
      caloriesBurned?: number;
    }) => {
      const result = await logWorkoutDayToAPI(
        data.workoutDate,
        data.workoutType,
        data.durationMinutes,
        data.caloriesBurned,
      );
      return result;
    },
    onSuccess: () => {
      // Invalidate streak query to refetch
      queryClient.invalidateQueries({ queryKey: STREAK_QUERY_KEY });
    },
  });
}
