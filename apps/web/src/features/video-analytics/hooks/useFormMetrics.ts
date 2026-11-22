'use client'

/**
 * Form metrics hooks for athlete detail page.
 * Shows per-exercise, per-day form metrics with trends.
 *
 * IMPORTANT: All communication goes through the Go API (apps/api).
 * This is the single source of truth for all data.
 */
import { useQuery } from '@tanstack/react-query'
import { goClient } from '@/lib/api/go-client'

export interface ExerciseFormStats {
  exercise_id: string
  exercise_name: string
  latest_score: number
  avg_score: number
  best_score: number
  worst_score: number
  trend: 'improving' | 'declining' | 'stable'
  sessions: number
  avg_depth: number
  avg_alignment: number
  avg_tempo: number
  history: { date: string; score: number }[]
}

export function useAthleteFormMetrics(athleteId: string) {
  return useQuery({
    queryKey: ['form-metrics', athleteId],
    queryFn: async (): Promise<ExerciseFormStats[]> => {
      const res = await goClient.get<{ data?: ExerciseFormStats[] } | ExerciseFormStats[]>(
        `/api/v1/form-metrics/athlete/${athleteId}`,
      )
      return Array.isArray(res) ? res : (res?.data ?? [])
    },
    enabled: Boolean(athleteId),
    staleTime: 5 * 60 * 1000,
  })
}
