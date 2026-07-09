'use client'

import { useState, useEffect, useCallback } from 'react'
import { MOCK_RECOVERY } from '../data/_mocks'
import type {
  RecoveryData,
  AIRecommendation,
  Stretch,
  HydrationData,
  SleepLogEntry,
  SleepQuality,
} from '../types'

export function useRecoveryData() {
  const [data, setData] = useState<RecoveryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dismissedRecs, setDismissedRecs] = useState<Set<string>>(new Set())

  useEffect(() => {
    let mounted = true
    const timer = setTimeout(() => {
      if (!mounted) return
      setData(MOCK_RECOVERY)
      setLoading(false)
    }, 600)
    return () => { mounted = false; clearTimeout(timer) }
  }, [])

  const toggleStretch = useCallback((id: string) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        stretches: prev.stretches.map((s) =>
          s.id === id ? { ...s, completed: !s.completed } : s
        ),
      }
    })
  }, [])

  const addWater = useCallback((amount: number) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        hydration: {
          ...prev.hydration,
          current: Math.min(prev.hydration.current + amount, prev.hydration.goal),
        },
      }
    })
  }, [])

  const dismissRecommendation = useCallback((id: string) => {
    setDismissedRecs((prev) => new Set(prev).add(id))
  }, [])

  const logSleep = useCallback((entry: SleepLogEntry) => {
    setData((prev) => {
      if (!prev) return prev
      const sleepHours = entry.hours > 0 ? entry.hours : prev.sleep.hours
      return {
        ...prev,
        sleep: {
          ...prev.sleep,
          hours: sleepHours,
          quality: entry.quality,
          bedtime: entry.bedtime || prev.sleep.bedtime,
          wakeTime: entry.wakeTime || prev.sleep.wakeTime,
        },
      }
    })
  }, [])

  const logSubjectiveScore = useCallback((score: number) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        recoveryScore: {
          ...prev.recoveryScore,
          subjective: score,
        },
      }
    })
  }, [])

  const allStretchesDone = data
    ? data.stretches.length > 0 && data.stretches.every((s) => s.completed)
    : false

  const visibleRecommendations = data
    ? data.aiRecommendations.filter((r) => !dismissedRecs.has(r.id))
    : []

  return {
    data,
    loading,
    error,
    allStretchesDone,
    visibleRecommendations,
    toggleStretch,
    addWater,
    dismissRecommendation,
    logSleep,
    logSubjectiveScore,
  }
}
