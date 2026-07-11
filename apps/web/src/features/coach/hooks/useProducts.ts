'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Product } from '../types'

const STORAGE_KEY = 'mr-training-products'

function load(): Product[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Product[]) : []
  } catch {
    return []
  }
}

function uid() {
  return `prod_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setProducts(load())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
  }, [products, hydrated])

  const addProduct = useCallback((data: Omit<Product, 'id' | 'createdAt'>) => {
    setProducts((prev) => [
      { ...data, id: uid(), createdAt: new Date().toISOString() },
      ...prev,
    ])
  }, [])

  const updateProduct = useCallback((id: string, patch: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }, [])

  const removeProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const adjustStock = useCallback((id: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p,
      ),
    )
  }, [])

  return { products, hydrated, addProduct, updateProduct, removeProduct, adjustStock }
}
