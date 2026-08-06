'use client'

import { useState, useEffect } from 'react'
import type { AthleteBrief } from '../types'
import { coachingApi } from '@/features/shared/api/client'

export function useAthletes() {
  const [athletes, setAthletes] = useState<AthleteBrief[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    coachingApi.getAthletes<AthleteBrief[]>()
      .then(data => setAthletes(data))
      .catch(() => setError('Failed to load athletes'))
      .finally(() => setIsLoading(false))
  }, [])

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
