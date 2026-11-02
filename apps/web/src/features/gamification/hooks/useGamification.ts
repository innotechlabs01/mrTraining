'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamificationApi } from '../api/client'

export function useStreak(athleteId?: string) {
  return useQuery({
    queryKey: ['gamification', 'streak', athleteId],
    queryFn: () => gamificationApi.getStreak(athleteId),
    staleTime: 5 * 60 * 1000,
    enabled: !!athleteId,
  })
}

export function useBadges(athleteId?: string) {
  return useQuery({
    queryKey: ['gamification', 'badges', athleteId],
    queryFn: () => gamificationApi.getBadges(athleteId),
    staleTime: 5 * 60 * 1000,
    enabled: !!athleteId,
  })
}

export function useCheckBadges() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (workoutId: string) => gamificationApi.checkBadges(workoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification', 'badges'] })
    },
  })
}

export function usePRs(athleteId?: string) {
  return useQuery({
    queryKey: ['gamification', 'prs', athleteId],
    queryFn: () => gamificationApi.getPRs(athleteId),
    staleTime: 5 * 60 * 1000,
    enabled: !!athleteId,
  })
}

export function useRecordPR() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { exercise_id: string; exercise_name: string; value: number; unit: string }) =>
      gamificationApi.recordPR(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification', 'prs'] })
    },
  })
}
