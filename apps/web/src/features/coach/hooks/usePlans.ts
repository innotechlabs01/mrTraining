'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Plan } from '../types'
import { coachingApi } from '@/features/shared/api/client'

export function usePlans() {
  const queryClient = useQueryClient()

  const { data: plans = [], isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['plans'],
    queryFn: () => coachingApi.getPlans<Plan[]>(),
    staleTime: 5 * 60_000,
  })

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null
  const refresh = () => refetch()

  const addPlanMutation = useMutation({
    mutationFn: (plan: Plan) => coachingApi.savePlan<{ id: string }>(plan),
    onSuccess: (res, variables) => {
      queryClient.setQueryData<Plan[]>(['plans'], (prev = []) => [
        ...prev,
        { ...variables, id: res.id },
      ])
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  })

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: Plan }) =>
      coachingApi.updatePlan<{ ok: boolean }>(id, plan),
    onSuccess: (_, { id, plan }) => {
      queryClient.setQueryData<Plan[]>(['plans'], (prev = []) =>
        prev.map((p) => (p.id === id ? { ...plan, id } : p)),
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  })

  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => coachingApi.deletePlan<{ ok: boolean }>(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Plan[]>(['plans'], (prev = []) => prev.filter((p) => p.id !== id))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  })

  const addPlan = async (plan: Plan) => (await addPlanMutation.mutateAsync(plan)).id
  const updatePlan = async (id: string, plan: Plan) => {
    await updatePlanMutation.mutateAsync({ id, plan })
  }
  const deletePlan = async (id: string) => {
    await deletePlanMutation.mutateAsync(id)
  }

  return {
    plans,
    isLoading,
    error,
    addPlan,
    updatePlan,
    deletePlan,
    refresh,
  }
}