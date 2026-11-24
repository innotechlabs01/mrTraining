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

  // Derived display values (guard against missing/undefined fields to avoid NaN)
  const toUsd = (cents: unknown) => {
    const n = Number(cents)
    return Number.isFinite(n) ? n / 100 : 0
  }
  const toCount = (val: unknown) => {
    const n = Number(val)
    return Number.isFinite(n) ? n : 0
  }

  const totalEarningsUsd = toUsd(earnings?.totalEarningsCents)
  const ownProfitUsd = toUsd(earnings?.ownProfitCents)
  const commissionTotalUsd = toUsd(earnings?.commissionTotalCents)
  const pendingUsd = toUsd(earnings?.pendingCents)
  const ownSalesTotalUsd = toUsd(earnings?.ownSalesTotalCents)

  return {
    earnings,
    isLoading,
    hydrated: !isLoading,
    totalEarnings: totalEarningsUsd,
    ownProfit: ownProfitUsd,
    commissionTotal: commissionTotalUsd,
    pending: pendingUsd,
    ownSalesTotal: ownSalesTotalUsd,
    ownSalesCount: toCount(earnings?.ownSalesCount),
    commissionCount: toCount(earnings?.commissionCount),
    byAlly: Array.isArray(earnings?.byAlly) ? earnings.byAlly : [],
    refresh: loadEarnings,
  }
}
