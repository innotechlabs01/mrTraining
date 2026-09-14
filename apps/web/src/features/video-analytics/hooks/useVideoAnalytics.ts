'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { videoAnalyticsApi } from '../api/client'

export function useTrackSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      workout_id?: string
      exercise_id: string
      exercise_name: string
      duration_sec: number
      rep_count: number
      avg_form_score: number
      min_form_score: number
      max_form_score: number
      video_url?: string
    }) => videoAnalyticsApi.track(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-analytics'] })
    },
  })
}

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ['video-analytics', 'summary'],
    queryFn: () => videoAnalyticsApi.getSummary(),
    staleTime: 5 * 60 * 1000,
  })
}

export function usePerExerciseAnalytics() {
  return useQuery({
    queryKey: ['video-analytics', 'per-exercise'],
    queryFn: () => videoAnalyticsApi.getPerExercise(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useVideoSessions(limit: number = 20, offset: number = 0) {
  return useQuery({
    queryKey: ['video-analytics', 'sessions', limit, offset],
    queryFn: () => videoAnalyticsApi.getSessions(limit, offset),
    staleTime: 2 * 60 * 1000,
  })
}
