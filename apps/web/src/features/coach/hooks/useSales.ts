'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Sale } from '../types'
import { coachingApi } from '@/features/shared/api/client'

/**
 * Sales via TanStack Query — reads are cached/hydratable (the coach dashboard
 * is prefetched server-side), mutations patch the cache with setQueryData.
 */
export function useSales() {
  const queryClient = useQueryClient()
  const KEY = ['coach-sales'] as const

  const { data: sales = [], isLoading, refetch } = useQuery({
    queryKey: KEY,
    queryFn: () => coachingApi.getSales(),
    staleTime: 60_000,
  })

  const loadSales = useCallback(() => {
    void refetch()
  }, [refetch])

  const registerSale = useCallback(async (data: {
    productId: string
    productName: string
    brand?: string
    quantity: number
    unitPrice: number
    unitReceived: number
  }) => {
    const total = data.quantity * data.unitPrice
    const createdAt = new Date().toISOString()
    const date = createdAt.split('T')[0]
    const res = await coachingApi.saveSale({ ...data, total, date })
    queryClient.setQueryData<Sale[]>(KEY, (prev = []) => [
      { ...data, id: res.id, total, date, createdAt },
      ...prev,
    ])
  }, [queryClient])

  const getSalesForDay = useCallback((date: string) => {
    return sales.filter((s) => s.date === date)
  }, [sales])

  const getAggregatedToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0]
    const todaySales = sales.filter((s) => s.date === today)
    const aggregated = todaySales.reduce((acc, s) => {
      const key = `${s.productId}|${s.productName}|${s.brand || ''}`
      if (!acc[key]) {
        acc[key] = {
          productId: s.productId,
          productName: s.productName,
          brand: s.brand,
          quantity: 0,
          total: 0,
        }
      }
      acc[key].quantity += s.quantity
      acc[key].total += s.total
      return acc
    }, {} as Record<string, {productId:string; productName:string; brand?:string; quantity:number; total:number}>)
    return Object.values(aggregated)
  }, [sales])

  const removeSale = useCallback(async (id: string) => {
    await coachingApi.deleteSale(id)
    queryClient.setQueryData<Sale[]>(KEY, (prev = []) => prev.filter(s => s.id !== id))
  }, [queryClient])

  return { sales, isLoading, hydrated: !isLoading, registerSale, getSalesForDay, getAggregatedToday, removeSale, refresh: loadSales }
}
