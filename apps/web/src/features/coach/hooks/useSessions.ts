'use client'

import { useState, useEffect } from 'react'
import type { CoachSession } from '../types'
import { coachingApi } from '@/features/shared/api/client'

export function useSessions() {
  const [sessions, setSessions] = useState<CoachSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    coachingApi.getSessions<CoachSession[]>()
      .then(data => setSessions(data))
      .catch(() => setError('Failed to load sessions'))
      .finally(() => setIsLoading(false))
  }, [])

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
