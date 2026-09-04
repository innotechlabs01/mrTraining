'use client'

import { useQuery } from '@tanstack/react-query'
import type { AthleteBrief } from '../types'
import { coachingApi } from '@/features/shared/api/client'

export function useAthletes() {
  const { data: athletes = [], isLoading, error: queryError } = useQuery({
    queryKey: ['athletes'],
    queryFn: () => coachingApi.getAthletes<AthleteBrief[]>(),
    staleTime: 5 * 60_000,
  })

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null

  const athletesWithFlags = athletes.filter(a => a.flag)
  const flaggedAthletes = athletesWithFlags
  const athletesNeedingAttention = athletes.filter(
    (a) => a.readiness.score < 60 || a.flag?.severity === 'high',
  )
  const readinessMap = Object.fromEntries(athletes.map(a => [a.id, a.readiness]))
  const getAthleteById = (id: string) => athletes.find((a) => a.id === id)

  return {
    athletes,
    athletesWithFlags,
    flaggedAthletes,
    athletesNeedingAttention,
    readinessMap,
    getAthleteById,
    isLoading,
    error,
  }
}