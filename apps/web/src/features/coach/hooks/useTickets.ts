'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { SupportTicket, TicketMessage } from '@/features/coach/types'
import { coachingApi } from '@/features/shared/api/client'

export function useTickets() {
  const queryClient = useQueryClient()

  const { data: tickets = [], isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => coachingApi.getTickets<SupportTicket[]>(),
    staleTime: 5 * 60_000,
  })

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null
  const refresh = () => refetch()

  const createTicketMutation = useMutation({
    mutationFn: (ticket: Partial<SupportTicket>) => coachingApi.saveTicket<{ id: string }>(ticket),
    onSuccess: (res, variables) => {
      queryClient.setQueryData<SupportTicket[]>(['tickets'], (prev = []) => [
        ...prev,
        { ...variables, id: res.id } as SupportTicket,
      ])
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  })

  const updateTicketMutation = useMutation({
    mutationFn: ({ id, ticket }: { id: string; ticket: Partial<SupportTicket> }) =>
      coachingApi.updateTicket<{ ok: boolean }>(id, ticket),
    onSuccess: (_, { id, ticket }) => {
      queryClient.setQueryData<SupportTicket[]>(['tickets'], (prev = []) =>
        prev.map((t) => (t.id === id ? { ...t, ...ticket } : t)),
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  })

  const deleteTicketMutation = useMutation({
    mutationFn: (id: string) => coachingApi.deleteTicket<{ ok: boolean }>(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<SupportTicket[]>(['tickets'], (prev = []) => prev.filter((t) => t.id !== id))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  })

  const createTicket = async (ticket: Partial<SupportTicket>) => (await createTicketMutation.mutateAsync(ticket)).id
  const updateTicket = async (id: string, ticket: Partial<SupportTicket>) => {
    await updateTicketMutation.mutateAsync({ id, ticket })
  }
  const deleteTicket = async (id: string) => {
    await deleteTicketMutation.mutateAsync(id)
  }

  return {
    tickets,
    isLoading,
    error,
    createTicket,
    updateTicket,
    deleteTicket,
    refresh,
  }
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => coachingApi.getTicket<SupportTicket>(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useTicketMessages(ticketId: string) {
  return useQuery({
    queryKey: ['ticket-messages', ticketId],
    queryFn: () => coachingApi.getTicketMessages<TicketMessage[]>(ticketId),
    enabled: !!ticketId,
    staleTime: 10_000,
  })
}

export function useTicketUnreadCount(ticketId: string) {
  return useQuery({
    queryKey: ['ticket-unread', ticketId],
    queryFn: () => coachingApi.getTicketUnreadCount<{ count: number }>(ticketId),
    enabled: !!ticketId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export function useAddTicketMessage(ticketId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { body: string; image_url?: string }) =>
      coachingApi.addTicketMessage<{ id: string }>(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticketId] })
      queryClient.invalidateQueries({ queryKey: ['ticket-unread', ticketId] })
    },
  })
}

export function useMarkTicketRead(ticketId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => coachingApi.markTicketRead<{ ok: boolean }>(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-unread', ticketId] })
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticketId] })
    },
  })
}

export function useAthleteTickets() {
  const { data: tickets = [], isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['athlete-tickets'],
    queryFn: () => coachingApi.getAthleteTickets<SupportTicket[]>(),
    staleTime: 5 * 60_000,
  })

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null
  const refresh = () => refetch()

  const createTicketMutation = useMutation({
    mutationFn: (ticket: { subject: string; body: string; category?: string; priority?: string; image_url?: string }) =>
      coachingApi.createAthleteTicket<{ id: string }>(ticket),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['athlete-tickets'] })
    },
  })

  const createTicket = async (ticket: { subject: string; body: string; category?: string; priority?: string; image_url?: string }) =>
    (await createTicketMutation.mutateAsync(ticket)).id

  return {
    tickets,
    isLoading,
    error: queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null,
    createTicket,
    refresh,
  }
}

export function useAthleteTicket(id: string) {
  return useQuery({
    queryKey: ['athlete-ticket', id],
    queryFn: () => coachingApi.getAthleteTicket<SupportTicket>(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}