'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { EarningsSummary } from '../types'
import { coachingApi } from '@/features/shared/api/client'

/**
 * Coach earnings via TanStack Query.
 * Aggregates: own product sales profit + ally commissions.
 */
export function useEarnings() {
  const queryClient = useQueryClient()
  const KEY = ['coach-earnings'] as const

  const { data, isLoading, refetch } = useQuery({
    queryKey: KEY,
    queryFn: () => coachingApi.getEarningsSummary(),
    staleTime: 60_000,
  })

  const loadEarnings = useCallback(() => {
    void refetch()
  }, [refetch])

  const earnings: EarningsSummary | null = data ?? null

  // Derived display values
  const totalEarningsUsd = earnings ? earnings.totalEarningsCents / 100 : 0
  const ownProfitUsd = earnings ? earnings.ownProfitCents / 100 : 0
  const commissionTotalUsd = earnings ? earnings.commissionTotalCents / 100 : 0
  const pendingUsd = earnings ? earnings.pendingCents / 100 : 0
  const ownSalesTotalUsd = earnings ? earnings.ownSalesTotalCents / 100 : 0

  return {
    earnings,
    isLoading,
    hydrated: !isLoading,
    totalEarnings: totalEarningsUsd,
    ownProfit: ownProfitUsd,
    commissionTotal: commissionTotalUsd,
    pending: pendingUsd,
    ownSalesTotal: ownSalesTotalUsd,
    ownSalesCount: earnings?.ownSalesCount ?? 0,
    commissionCount: earnings?.commissionCount ?? 0,
    byAlly: earnings?.byAlly ?? [],
    refresh: loadEarnings,
  }
}
