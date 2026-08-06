'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PaymentMethod } from '@/features/coach/types'
import { coachingApi } from '@/features/shared/api/client'

export interface NewPaymentMethodInput {
  bank: string
  holder: string
  accountType: PaymentMethod['accountType']
  accountNumber: string
  clabe: string
  notes?: string
}

export function usePaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(() => {
    setIsLoading(true)
    coachingApi.getPaymentMethods<PaymentMethod[]>()
      .then(data => setMethods(data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const addMethod = useCallback(
    async (input: NewPaymentMethodInput) => {
      const res = await coachingApi.savePaymentMethod<{ id: string }>(input)
      const method: PaymentMethod = { id: res.id, notes: '', ...input }
      setMethods(prev => [...prev, method])
      return method
    },
    [],
  )

  const updateMethod = useCallback(
    async (id: string, patch: Partial<PaymentMethod>) => {
      const current = methods.find(m => m.id === id)
      if (!current) return
      const updated = { ...current, ...patch }
      await coachingApi.updatePaymentMethod(id, updated)
      setMethods(prev => prev.map(m => m.id === id ? updated : m))
    },
    [methods],
  )

  const removeMethod = useCallback(
    async (id: string) => {
      await coachingApi.deletePaymentMethod(id)
      setMethods(prev => prev.filter(m => m.id !== id))
    },
    [],
  )

  return { methods, isLoading, addMethod, updateMethod, removeMethod }
}
