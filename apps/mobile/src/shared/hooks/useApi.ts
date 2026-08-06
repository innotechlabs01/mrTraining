import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@infrastructure/api/client';
import type { Athlete, WorkoutSession, AssignedWorkout, RecoveryData } from '@shared/types';

function useAthleteQuery<T>(key: string[], url: string, enabled = true) {
  return useQuery<T>({
    queryKey: key,
    queryFn: async () => {
      const { data } = await apiClient.get<T>(url);
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTodayWorkouts(athleteId: string) {
  return useAthleteQuery<WorkoutSession[]>(
    ['sessions', athleteId],
    `/sessions?athleteId=${athleteId}`,
    !!athleteId,
  );
}

export function useAssignedWorkouts(athleteId: string) {
  return useAthleteQuery<AssignedWorkout[]>(
    ['assigned-workouts', athleteId],
    `/assigned-workouts?athleteId=${athleteId}`,
    !!athleteId,
  );
}

export function useAthleteProfile(athleteId: string) {
  return useAthleteQuery<Athlete>(
    ['athlete', athleteId],
    `/athletes/${athleteId}`,
    !!athleteId,
  );
}

export function useRecoveryData(_athleteId: string) {
  return useAthleteQuery<RecoveryData>(
    ['recovery', _athleteId],
    `/recovery/${_athleteId}`,
    !!_athleteId,
  );
}

export function useCompleteWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      const { data } = await apiClient.post(`/sessions/${sessionId}/complete`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
