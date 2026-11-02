'use client'

import { useQuery } from '@tanstack/react-query'
import type { CoachSession } from '../types'
import { coachingApi } from '@/features/shared/api/client'

export function useSessions() {
  const { data: sessions = [], isLoading, error: queryError } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => coachingApi.getSessions<CoachSession[]>(),
    staleTime: 30_000,
  })

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null

  const athleteSessionMap: Record<string, CoachSession[]> = {}
  for (const session of sessions) {
    for (const aid of session.athleteIds) {
      if (!athleteSessionMap[aid]) athleteSessionMap[aid] = []
      athleteSessionMap[aid].push(session)
    }
  }

  return {
    sessions,
    athleteSessionMap,
    isLoading,
    error,
  }
}