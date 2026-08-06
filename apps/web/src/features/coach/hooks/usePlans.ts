'use client'

import { useState, useEffect } from 'react'
import type { Plan } from '../types'
import { coachingApi } from '@/features/shared/api/client'

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPlans = () => {
    setIsLoading(true)
    coachingApi.getPlans<Plan[]>()
      .then(data => setPlans(data))
      .catch(() => setError('Failed to load plans'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadPlans()
  }, [])

  const addPlan = async (plan: Plan) => {
    return coachingApi.savePlan<{ id: string }>(plan).then(res => {
      setPlans(prev => [...prev, { ...plan, id: res.id }])
      return res.id
    })
  }

  const updatePlan = async (id: string, plan: Plan) => {
    return coachingApi.updatePlan<{ ok: boolean }>(id, plan).then(() => {
      setPlans(prev => prev.map(p => p.id === id ? { ...plan, id } : p))
    })
  }

  const deletePlan = async (id: string) => {
    return coachingApi.deletePlan<{ ok: boolean }>(id).then(() => {
      setPlans(prev => prev.filter(p => p.id !== id))
    })
  }

  return {
    plans,
    isLoading,
    error,
    addPlan,
    updatePlan,
    deletePlan,
    refresh: loadPlans,
  }
}
