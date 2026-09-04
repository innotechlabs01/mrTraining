'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { SupportTicket } from '../types'
import { coachingApi } from '@/features/shared/api/client'

export function useTickets() {
  const queryClient = useQueryClient()

  const { data: tickets = [], isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => coachingApi.getTickets<SupportTicket[]>(),
    staleTime: 60_000,
  })

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null

  const refresh = () => refetch()

  const addTicketMutation = useMutation({
    mutationFn: (ticket: SupportTicket) => coachingApi.saveTicket<{ id: string }>(ticket),
    onSuccess: (_, variables) => {
      queryClient.setQueryData<SupportTicket[]>(['tickets'], (prev = []) => [
        ...prev,
        { ...variables, id: _.id },
      ])
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  const addTicket = async (ticket: SupportTicket) => {
    const res = await addTicketMutation.mutateAsync(ticket)
    return res.id
  }

  return {
    tickets,
    isLoading,
    error,
    addTicket,
    refresh,
  }
}