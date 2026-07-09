'use client'

import { useMemo } from 'react'
import { useProgressComparison } from './useProgressComparison'
import { useProgressAnalytics } from './useProgressAnalytics'
import type { ComparisonData } from './useProgressComparison'
import type { AnalyticsResult, ProgressDataPoint } from './useProgressAnalytics'

export interface DashboardViewModel {
  comparison: {
    data: ComparisonData | null
    isLoading: boolean
    error: string | null
    refetch: () => void
  }
  analytics: {
    result: AnalyticsResult | null
    isAnalyzing: boolean
    error: string | null
    analyze: (data: ProgressDataPoint[]) => Promise<void>
  }
  isReady: boolean
}

export function useProgressDashboard(userId: string): DashboardViewModel {
  const comparison = useProgressComparison(userId)
  const analytics = useProgressAnalytics()

  const isReady = useMemo(
    () => !!comparison.data && !comparison.isLoading,
    [comparison.data, comparison.isLoading]
  )

  return {
    comparison,
    analytics,
    isReady,
  }
}
