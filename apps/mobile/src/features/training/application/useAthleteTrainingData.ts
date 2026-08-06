import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useAssignedWorkouts, useTodayWorkouts } from '@shared/hooks/useApi';
import { useClerkUserId } from '@infrastructure/auth/useClerkUserId';

export function useAthleteTrainingData() {
  const athleteId = useClerkUserId();

  const {
    data: todayWorkouts,
    isLoading: todayLoading,
    isError: todayError,
    refetch: refetchToday,
  } = useTodayWorkouts(athleteId ?? '');

  const {
    data: assignedWorkouts,
    isLoading: assignedLoading,
    isError: assignedError,
    refetch: refetchAssigned,
  } = useAssignedWorkouts(athleteId ?? '');

  const refresh = useCallback(() => {
    refetchToday();
    refetchAssigned();
  }, [refetchToday, refetchAssigned]);

  if (todayError || assignedError) {
    Alert.alert('Connection Error', 'Could not load training data. Pull to retry.');
  }

  return {
    todayWorkouts: todayWorkouts ?? [],
    assignedWorkouts: assignedWorkouts ?? [],
    isLoading: todayLoading || assignedLoading,
    refresh,
  };
}
