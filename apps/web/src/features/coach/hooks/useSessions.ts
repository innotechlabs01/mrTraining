'use client'

import { useMemo } from 'react'
import type { CoachSession } from '../types'
import { MOCK_SESSIONS } from '../data/_mocks'

export function useSessions() {
  const sessions = useMemo(() => MOCK_SESSIONS, [])

  const getSessionById = (id: string): CoachSession | undefined =>
    sessions.find((s) => s.id === id)

  const getSessionsForAthlete = (athleteId: string): CoachSession[] =>
    sessions.filter((s) => s.athleteIds.includes(athleteId))

  return {
    sessions,
    getSessionById,
    getSessionsForAthlete,
    isLoading: false,
    error: null,
  }
}
