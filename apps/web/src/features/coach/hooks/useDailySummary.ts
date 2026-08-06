'use client'

import { useState, useEffect } from 'react'
import type { DailySummary } from '../types'
import { coachingApi } from '@/features/shared/api/client'

export function useDailySummary() {
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    coachingApi.getDailySummary<DailySummary | null>()
      .then(data => setSummary(data))
      .catch(() => setError('Failed to load daily summary'))
      .finally(() => setIsLoading(false))
  }, [])

  return { summary, isLoading, error }
}
