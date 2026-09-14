'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamificationApi } from '../api/client'

export function useStreak() {
  return useQuery({
    queryKey: ['gamification', 'streak'],
    queryFn: () => gamificationApi.getStreak(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useBadges() {
  return useQuery({
    queryKey: ['gamification', 'badges'],
    queryFn: () => gamificationApi.getBadges(),
    staleTime: 5 * 60 * 1000,
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

export function usePRs() {
  return useQuery({
    queryKey: ['gamification', 'prs'],
    queryFn: () => gamificationApi.getPRs(),
    staleTime: 5 * 60 * 1000,
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
