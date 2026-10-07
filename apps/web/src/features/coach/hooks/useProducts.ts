'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Product } from '../types'
import { coachingApi } from '@/features/shared/api/client'

/**
 * Products via TanStack Query (server-state cache). Mutations update the
 * cache optimistically via setQueryData — same imperative API as the legacy
 * useState version, but reads are now deduped, hydratable and cached.
 */
export function useProducts() {
  const queryClient = useQueryClient()
  const KEY = ['coach-products'] as const

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: KEY,
    queryFn: () => coachingApi.getProducts(),
    staleTime: 60_000,
  })

  const loadProducts = useCallback(() => {
    void refetch()
  }, [refetch])

  const addProduct = useCallback(async (data: Omit<Product, 'id' | 'createdAt'>) => {
    const res = await coachingApi.saveProduct(data)
    queryClient.setQueryData<Product[]>(KEY, (prev = []) => [
      { ...data, id: res.id, createdAt: new Date().toISOString() },
      ...prev,
    ])
  }, [queryClient])

  const updateProduct = useCallback(async (id: string, patch: Partial<Product>) => {
    const current = queryClient.getQueryData<Product[]>(KEY)?.find(p => p.id === id)
    if (!current) return
    const updated = { ...current, ...patch }
    await coachingApi.updateProduct(id, updated)
    queryClient.setQueryData<Product[]>(KEY, (prev = []) => prev.map(p => p.id === id ? updated : p))
  }, [queryClient])

  const removeProduct = useCallback(async (id: string) => {
    await coachingApi.deleteProduct(id)
    queryClient.setQueryData<Product[]>(KEY, (prev = []) => prev.filter(p => p.id !== id))
  }, [queryClient])

  const adjustStock = useCallback((id: string, delta: number) => {
    queryClient.setQueryData<Product[]>(KEY, (prev = []) =>
      prev.map(p =>
        p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p,
      ),
    )
  }, [queryClient])

  return { products, isLoading, hydrated: !isLoading, addProduct, updateProduct, removeProduct, adjustStock, refresh: loadProducts }
}
