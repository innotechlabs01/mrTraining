/**
 * useFormRecording — Manages form metrics collection during workout execution.
 *
 * Collects form quality metrics (score, depth, alignment, tempo) after each set.
 * Stores locally as JSON, syncs to server after workout.
 *
 * Respects user consent — no recording without explicit permission.
 *
 * Usage:
 * - hasConsent — whether user accepted recording
 * - requestConsent() — show consent screen
 * - saveMetrics(score, metrics) — save after each set
 * - syncPending() — upload all metrics
 */
import { useCallback, useState } from 'react'
import {
  getConsentState,
  setConsentState,
  saveFormMetric,
  getMetricsCount,
  type ConsentState,
} from '../../../infrastructure/storage/FormMetricsStorage'
import { syncAfterWorkout } from '../../../infrastructure/storage/FormMetricsSync'

export type UseFormRecordingReturn = {
  consentState: ConsentState
  hasConsent: boolean
  pendingCount: number
  requestConsent: () => void
  handleConsentResponse: (accepted: boolean) => void
  saveMetrics: (exerciseId: string, exerciseName: string, workoutId: string | undefined, formScore: number, formMetrics: { depth: number; alignment: number; tempo: number }) => Promise<boolean>
  syncPending: () => Promise<void>
}

export function useFormRecording(): UseFormRecordingReturn {
  const [consentState, setConsentStateLocal] = useState<ConsentState>('pending')
  const [pendingCount, setPendingCount] = useState(0)
  const [showConsent, setShowConsent] = useState(false)

  // Check consent on mount
  const checkConsent = useCallback(async () => {
    const state = await getConsentState()
    setConsentStateLocal(state)
    if (state === 'pending') {
      setShowConsent(true)
    }
  }, [])

  // Initialize
  useState(() => {
    checkConsent()
    getMetricsCount().then(setPendingCount)
  })

  const hasConsent = consentState === 'accepted'

  const requestConsent = useCallback(() => {
    setShowConsent(true)
  }, [])

  const handleConsentResponse = useCallback(async (accepted: boolean) => {
    await setConsentState(accepted ? 'accepted' : 'denied')
    setConsentStateLocal(accepted ? 'accepted' : 'denied')
    setShowConsent(false)
  }, [])

  // Save metrics for a set
  const saveMetrics = useCallback(async (
    exerciseId: string,
    exerciseName: string,
    workoutId: string | undefined,
    formScore: number,
    formMetrics: { depth: number; alignment: number; tempo: number },
  ): Promise<boolean> => {
    if (!hasConsent) return false

    try {
      await saveFormMetric({
        exerciseId,
        exerciseName,
        workoutId,
        formScore,
        depth: formMetrics.depth,
        alignment: formMetrics.alignment,
        tempo: formMetrics.tempo,
      })

      const count = await getMetricsCount()
      setPendingCount(count)
      return true
    } catch (err) {
      console.error('Failed to save metrics:', err)
      return false
    }
  }, [hasConsent])

  // Sync all pending metrics
  const syncPending = useCallback(async () => {
    await syncAfterWorkout()
    const count = await getMetricsCount()
    setPendingCount(count)
  }, [])

  return {
    consentState,
    hasConsent,
    pendingCount,
    requestConsent,
    handleConsentResponse,
    saveMetrics,
    syncPending,
  }
}
