'use client'

import { useState, useCallback } from 'react'

export interface ProgressDataPoint {
  date: string
  value: number
}

export interface TrendResult {
  direction: 'up' | 'down' | 'stable'
  magnitude: number
  confidence: number
}

export interface PredictionResult {
  predictedValue: number
  confidenceInterval: { lower: number; upper: number }
}

export interface Insight {
  type: 'improvement' | 'decline' | 'plateau' | 'achievement'
  message: string
  priority: 'low' | 'medium' | 'high'
}

export interface AnalyticsResult {
  trend: TrendResult
  prediction: PredictionResult
  insights: Insight[]
  summary: string
}

export function useProgressAnalytics() {
  const [result, setResult] = useState<AnalyticsResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyze = useCallback(async (data: ProgressDataPoint[]) => {
    if (!data || data.length < 2) {
      setError('At least 2 data points required')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const res = await fetch('/api/progress/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })
      const json = await res.json()

      if (!json.success) {
        throw new Error(json.error || 'Failed to analyze progress')
      }

      setResult(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  return { result, isAnalyzing, error, analyze }
}
