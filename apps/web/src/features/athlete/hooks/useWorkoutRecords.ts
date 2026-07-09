'use client'

import { useState, useEffect, useCallback } from 'react'
import type { WorkoutSessionRecord, WorkoutStats } from '@/features/workout/types'
import { MOCK_SESSION_RECORDS, MOCK_STATS } from '@/features/workout/data/_mocks'

export function useWorkoutRecords() {
  const [records, setRecords] = useState<WorkoutSessionRecord[]>([])
  const [stats, setStats] = useState<WorkoutStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const timer = setTimeout(() => {
      if (!mounted) return
      setRecords(MOCK_SESSION_RECORDS)
      setStats(MOCK_STATS)
      setLoading(false)
    }, 700)
    return () => { mounted = false; clearTimeout(timer) }
  }, [])

  const getRecord = useCallback((id: string) => records.find(r => r.id === id), [records])

  return { records, stats, loading, error, getRecord }
}
