'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Sale } from '../types'
import { coachingApi } from '@/features/shared/api/client'

export function useSales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  const loadSales = useCallback(() => {
    setIsLoading(true)
    coachingApi.getSales<Sale[]>()
      .then(data => setSales(data))
      .catch(() => {})
      .finally(() => { setIsLoading(false); setHydrated(true) })
  }, [])

  useEffect(() => {
    loadSales()
  }, [loadSales])

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
    const res = await coachingApi.saveSale<{ id: string }>({ ...data, total, date, createdAt })
    setSales(prev => [
      { ...data, id: res.id, total, date, createdAt },
      ...prev,
    ])
  }, [])

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
    setSales(prev => prev.filter(s => s.id !== id))
  }, [])

  return { sales, isLoading, hydrated, registerSale, getSalesForDay, getAggregatedToday, removeSale, refresh: loadSales }
}
