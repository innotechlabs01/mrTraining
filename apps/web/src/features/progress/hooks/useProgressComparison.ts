'use client'

import { useState, useEffect, useCallback } from 'react'

export interface ComparisonData {
  sportSimilarityScore: number
  crossSportComparisonScore: number
  performanceConsistencyScore: number
  overallProgressScore: number
}

export function useProgressComparison(userId: string) {
  const [data, setData] = useState<ComparisonData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!userId) {
      setError('User ID is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/progress?userId=${encodeURIComponent(userId)}`)
      const json = await res.json()

      if (!json.success) {
        throw new Error(json.error || 'Failed to fetch progress data')
      }

      const normalizeRes = await fetch('/api/progress/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json.data),
      })
      const normalizeJson = await normalizeRes.json()

      if (!normalizeJson.success) {
        throw new Error(normalizeJson.error || 'Failed to normalize progress')
      }

      setData(normalizeJson.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}
