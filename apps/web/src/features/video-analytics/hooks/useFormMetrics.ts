'use client'

/**
 * Form metrics hooks for athlete detail page.
 * Shows per-exercise, per-day form metrics with trends.
 *
 * IMPORTANT: All communication goes through the Go API (apps/api).
 * This is the single source of truth for all data.
 */
import { useQuery } from '@tanstack/react-query'

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
      // Go API endpoint
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const res = await fetch(`${apiUrl}/api/v1/form-metrics/athlete/${athleteId}`)
      if (!res.ok) throw new Error('Failed to fetch form metrics')
      const data = await res.json()
      return data.data || data
    },
    staleTime: 5 * 60 * 1000,
  })
}
