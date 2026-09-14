/**
 * usePRs hook — React Query integration for personal record tracking.
 * Fetches from API with local fallback.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPRsFromAPI,
  recordPRToAPI,
  evaluateAttempt,
  updatePRs,
  type PersonalRecord,
  type PRAttempt,
  type PRComparison,
} from '../domain/prService';

const PRS_QUERY_KEY = ['gamification', 'prs'];

/**
 * Hook to fetch the athlete's personal records.
 * Returns local fallback data if API unavailable.
 */
export function usePRs(localPRs: PersonalRecord[] = []) {
  return useQuery({
    queryKey: PRS_QUERY_KEY,
    queryFn: async (): Promise<PersonalRecord[]> => {
      // Try API first
      const apiPRs = await fetchPRsFromAPI();
      if (apiPRs.length > 0) return apiPRs;

      // Fallback to local data
      return localPRs;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to record a new PR attempt.
 */
export function useRecordPR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attempt: PRAttempt): Promise<{
      pr: PersonalRecord;
      comparison: PRComparison;
    }> => {
      // Try API first
      const apiResult = await recordPRToAPI(attempt);
      if (apiResult) {
        return {
          pr: apiResult.pr,
          comparison: {
            exerciseId: attempt.exerciseId,
            isNewPR: apiResult.isNewPR,
            previousBest: apiResult.pr.previousBest ?? null,
            newBest: apiResult.pr.bestValue,
            improvement: apiResult.isNewPR
              ? apiResult.pr.bestValue - (apiResult.pr.previousBest ?? 0)
              : null,
            improvementPercent: null,
            unit: attempt.unit,
          },
        };
      }

      // Fallback to local evaluation
      const currentPRs = queryClient.getQueryData<PersonalRecord[]>(PRS_QUERY_KEY) ?? [];
      const comparison = evaluateAttempt(attempt, currentPRs);

      if (comparison.isNewPR) {
        const updatedPRs = updatePRs(currentPRs, attempt);
        queryClient.setQueryData(PRS_QUERY_KEY, updatedPRs);
      }

      return {
        pr: {
          exerciseId: attempt.exerciseId,
          exerciseName: attempt.exerciseName,
          bestValue: comparison.newBest,
          unit: attempt.unit,
          achievedAt: attempt.attemptedAt,
          previousBest: comparison.previousBest ?? undefined,
        },
        comparison,
      };
    },
    onSuccess: () => {
      // Invalidate PRs query to refetch
      queryClient.invalidateQueries({ queryKey: PRS_QUERY_KEY });
    },
  });
}
