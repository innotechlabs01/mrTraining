'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Product } from '../types'
import { coachingApi } from '@/features/shared/api/client'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  const loadProducts = useCallback(() => {
    setIsLoading(true)
    coachingApi.getProducts<Product[]>()
      .then(data => setProducts(data))
      .catch(() => {})
      .finally(() => { setIsLoading(false); setHydrated(true) })
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const addProduct = useCallback(async (data: Omit<Product, 'id' | 'createdAt'>) => {
    const res = await coachingApi.saveProduct<{ id: string }>(data)
    setProducts(prev => [
      { ...data, id: res.id, createdAt: new Date().toISOString() },
      ...prev,
    ])
  }, [])

  const updateProduct = useCallback(async (id: string, patch: Partial<Product>) => {
    const current = products.find(p => p.id === id)
    if (!current) return
    const updated = { ...current, ...patch }
    await coachingApi.updateProduct(id, updated)
    setProducts(prev => prev.map(p => p.id === id ? updated : p))
  }, [products])

  const removeProduct = useCallback(async (id: string) => {
    await coachingApi.deleteProduct(id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }, [])

  const adjustStock = useCallback((id: string, delta: number) => {
    setProducts(prev =>
      prev.map(p =>
        p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p,
      ),
    )
  }, [])

  return { products, isLoading, hydrated, addProduct, updateProduct, removeProduct, adjustStock, refresh: loadProducts }
}
