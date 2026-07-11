'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Sale, Product } from '../types'

const STORAGE_KEY = 'mr-training-sales'

function load(): Sale[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Sale[]) : []
  } catch {
    return []
  }
}

function uid() {
  return `sale_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`
}

export function useSales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setSales(load())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sales))
  }, [sales, hydrated])

  const registerSale = useCallback((data: {
    productId: string
    productName: string
    brand?: string
    quantity: number
    unitPrice: number
    unitReceived: number
  }) => {
    setSales((prev) => {
      const total = data.quantity * data.unitPrice
      const createdAt = new Date().toISOString()
      const date = createdAt.split('T')[0]
      return [
        { ...data, id: uid(), total, date, createdAt },
        ...prev,
      ]
    })
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

  return { sales, hydrated, registerSale, getSalesForDay, getAggregatedToday }
}
