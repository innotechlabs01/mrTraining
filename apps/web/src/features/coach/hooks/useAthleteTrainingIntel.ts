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

    Promise.allSettled([
      trainingApi.getTrainingSummary(athleteId),
      trainingApi.getOneRm(athleteId),
      trainingApi.getFatigueMap(athleteId),
      trainingApi.getEffort(athleteId),
    ])
      .then(([summaryRes, oneRmRes, fatigueRes, effortRes]) => {
        if (cancelled) return
        setIntel({
          summary: summaryRes.status === 'fulfilled' ? summaryRes.value : null,
          oneRm: oneRmRes.status === 'fulfilled' ? oneRmRes.value : null,
          fatigue: fatigueRes.status === 'fulfilled' ? fatigueRes.value : null,
          effort: effortRes.status === 'fulfilled' ? effortRes.value : null,
        })
        const results = [summaryRes, oneRmRes, fatigueRes, effortRes]
        if (results.every((r) => r.status === 'rejected')) {
          const reason = (results[0] as PromiseRejectedResult).reason
          setError(reason instanceof Error ? reason.message : 'Failed to load training data')
        } else {
          setError(null)
        }
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [athleteId])

  return { intel, isLoading, error }
}
