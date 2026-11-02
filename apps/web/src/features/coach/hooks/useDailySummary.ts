'use client'

import { useQuery } from '@tanstack/react-query'
import type { DailySummary } from '../types'
import { coachingApi } from '@/features/shared/api/client'

export function useDailySummary() {
  const { data: summary = null, isLoading, error: queryError } = useQuery({
    queryKey: ['daily-summary'],
    queryFn: () => coachingApi.getDailySummary<DailySummary | null>(),
    staleTime: 5 * 60_000,
  })

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null

  return { summary, isLoading, error }
}