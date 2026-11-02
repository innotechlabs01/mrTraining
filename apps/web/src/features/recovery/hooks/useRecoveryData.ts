'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  RecoveryData,
  AIRecommendation,
  Stretch,
  HydrationData,
  SleepLogEntry,
  SleepQuality,
} from '../types'

const API_BASE = '/api/coaching/recovery'

export function useRecoveryData() {
  const [data, setData] = useState<RecoveryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dismissedRecs, setDismissedRecs] = useState<Set<string>>(new Set())

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch(API_BASE)
        if (!res.ok) throw new Error('Failed to load recovery data')
        const entry = await res.json()

        // Map DB row to RecoveryData shape
        const mapped: RecoveryData = {
          date: entry.date,
          sleep: {
            hours: entry.sleepHours ?? 0,
            quality: (entry.sleepQuality ?? 'unknown') as SleepQuality,
            deepSleep: 0,
            remSleep: 0,
            lightSleep: 0,
            awake: 0,
            bedtime: entry.sleepBedtime ?? '',
            wakeTime: entry.sleepWakeTime ?? '',
            consistency: 0,
          },
          hrv: {
            current: entry.hrvCurrent ?? 0,
            baseline: entry.hrvBaseline ?? 0,
            trend: 'stable',
            sevenDayAvg: 0,
            readings: [],
          },
          stress: {
            current: entry.stressCurrent ?? 0,
            baseline: entry.stressBaseline ?? 0,
            trend: 'stable',
            sevenDayAvg: 0,
            readings: [],
          },
          hydration: {
            current: entry.hydrationCurrent ?? 0,
            goal: entry.hydrationGoal ?? 3000,
            trend: 'stable',
            sevenDayAvg: 0,
            history: [],
          },
          recoveryScore: {
            overall: entry.recoveryScore ?? 0,
            sleep: 0,
            hrv: 0,
            stress: 0,
            hydration: 0,
            subjective: entry.subjectiveScore ?? 0,
            trend: 'stable',
            history: [],
          },
          aiRecommendations: (entry.aiRecommendations ?? []).map((r: Record<string, unknown>) => ({
            id: r.id as string,
            type: r.type as string,
            title: r.title as string,
            description: r.description as string,
            reasoning: r.reasoning as string,
            priority: r.priority as string,
            actionLabel: r.actionLabel as string | undefined,
          })),
          stretches: (entry.stretches ?? []).map((s: Record<string, unknown>) => ({
            id: s.id as string,
            name: s.name as string,
            duration: s.durationSec as number,
            completed: Boolean(s.completed),
            category: s.category as string,
          })),
          readiness: (entry.recoveryScore ?? 0) >= 70 ? 'ready' : (entry.recoveryScore ?? 0) >= 40 ? 'moderate' : 'rest_needed',
        }

        if (mounted) {
          setData(mapped)
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error')
          setLoading(false)
        }
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const toggleStretch = useCallback(async (id: string) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        stretches: prev.stretches.map((s) =>
          s.id === id ? { ...s, completed: !s.completed } : s
        ),
      }
    })
    // Persist to API
    const stretch = data?.stretches.find((s) => s.id === id)
    if (stretch) {
      fetch(`${API_BASE}/stretch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stretchId: id, completed: !stretch.completed }),
      })
    }
  }, [data])

  const addWater = useCallback((amount: number) => {
    setData((prev) => {
      if (!prev) return prev
      const newCurrent = Math.min(prev.hydration.current + amount, prev.hydration.goal)
      // Persist to API
      fetch(`${API_BASE}/hydration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: prev.date, current: newCurrent }),
      })
      return {
        ...prev,
        hydration: {
          ...prev.hydration,
          current: newCurrent,
        },
      }
    })
  }, [])

  const dismissRecommendation = useCallback((id: string) => {
    setDismissedRecs((prev) => new Set(prev).add(id))
    fetch(`${API_BASE}/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recId: id }),
    })
  }, [])

  const logSleep = useCallback((entry: SleepLogEntry) => {
    setData((prev) => {
      if (!prev) return prev
      const sleepHours = entry.hours > 0 ? entry.hours : prev.sleep.hours
      // Persist to API
      fetch(`${API_BASE}/sleep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: prev.date,
          hours: sleepHours,
          quality: entry.quality,
          bedtime: entry.bedtime,
          wakeTime: entry.wakeTime,
        }),
      })
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
      // Persist to API
      fetch(`${API_BASE}/subjective`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: prev.date, score }),
      })
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
