'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AiSuggestion } from '../types'
import { coachingApi } from '@/features/shared/api/client'

export function useAI() {
  const queryClient = useQueryClient()

  const { data: suggestions = [], isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['ai-suggestions'],
    queryFn: () => coachingApi.getAISuggestions<AiSuggestion[]>(),
    staleTime: 60_000,
  })

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null

  const refresh = () => refetch()

  const addMutation = useMutation({
    mutationFn: (suggestion: AiSuggestion) =>
      coachingApi.saveAISuggestion<{ id: string }>(suggestion),
    onSuccess: (res, variables) => {
      queryClient.setQueryData<AiSuggestion[]>(['ai-suggestions'], (prev = []) => [
        ...prev,
        { ...variables, id: res.id },
      ])
      queryClient.invalidateQueries({ queryKey: ['ai-suggestions'] })
    },
  })

  const addSuggestion = async (suggestion: AiSuggestion) => {
    const res = await addMutation.mutateAsync(suggestion)
    return res.id
  }

  return {
    suggestions,
    isLoading,
    error,
    addSuggestion,
    refresh,
  }
}