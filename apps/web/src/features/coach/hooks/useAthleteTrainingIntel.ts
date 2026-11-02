'use client'

import { useState, useEffect } from 'react'
import { trainingApi, type TrainingSummaryResponse, type OneRmResponse, type FatigueMapResponse, type EffortResponse } from '@/features/shared/api/client'

export interface AthleteTrainingIntel {
  summary: TrainingSummaryResponse | null
  oneRm: OneRmResponse | null
  fatigue: FatigueMapResponse | null
  effort: EffortResponse | null
}

/**
 * Loads the four training-intelligence reads for one athlete (training summary,
 * estimated-1RM table, muscle fatigue map, aggregated RIR/RPE effort).
 */
export function useAthleteTrainingIntel(athleteId: string) {
  const [intel, setIntel] = useState<AthleteTrainingIntel>({ summary: null, oneRm: null, fatigue: null, effort: null })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!athleteId) return

    Promise.all([
      trainingApi.getTrainingSummary(athleteId),
      trainingApi.getOneRm(athleteId),
      trainingApi.getFatigueMap(athleteId),
      trainingApi.getEffort(athleteId),
    ])
      .then(([summary, oneRm, fatigue, effort]) => {
        if (cancelled) return
        setIntel({ summary, oneRm, fatigue, effort })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load training data')
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [athleteId])

  return { intel, isLoading, error }
}
