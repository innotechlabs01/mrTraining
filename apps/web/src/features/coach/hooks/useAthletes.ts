'use client'

import { useMemo } from 'react'
import type { AthleteBrief } from '../types'
import { MOCK_ATHLETES } from '../data/_mocks'

export function useAthletes() {
  const athletes = useMemo(() => MOCK_ATHLETES, [])

  const flaggedAthletes = useMemo(
    () => athletes.filter((a) => a.flag !== undefined),
    [athletes],
  )

  const athletesNeedingAttention = useMemo(
    () => athletes.filter((a) => a.readiness.score < 60 || a.flag?.severity === 'high'),
    [athletes],
  )

  const getAthleteById = (id: string): AthleteBrief | undefined =>
    athletes.find((a) => a.id === id)

  return {
    athletes,
    flaggedAthletes,
    athletesNeedingAttention,
    getAthleteById,
    isLoading: false,
    error: null,
  }
}
