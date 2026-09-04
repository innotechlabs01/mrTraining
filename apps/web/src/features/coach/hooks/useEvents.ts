'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CoachEvent } from '../types'
import { coachingApi } from '@/features/shared/api/client'

export function useEvents() {
  const queryClient = useQueryClient()

  const { data: events = [], isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['events'],
    queryFn: () => coachingApi.getEvents<CoachEvent[]>(),
    staleTime: 30_000,
  })

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null
  const refresh = () => refetch()

  const addEventMutation = useMutation({
    mutationFn: (event: CoachEvent) => coachingApi.saveEvent<{ id: string }>(event),
    onSuccess: (res, variables) => {
      queryClient.setQueryData<CoachEvent[]>(['events'], (prev = []) => [
        ...prev,
        { ...variables, id: res.id },
      ])
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  })

  const updateEventMutation = useMutation({
    mutationFn: ({ id, event }: { id: string; event: CoachEvent }) =>
      coachingApi.updateEvent<{ ok: boolean }>(id, event),
    onSuccess: (_, { id, event }) => {
      queryClient.setQueryData<CoachEvent[]>(['events'], (prev = []) =>
        prev.map((e) => (e.id === id ? { ...event, id } : e)),
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  })

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => coachingApi.deleteEvent<{ ok: boolean }>(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<CoachEvent[]>(['events'], (prev = []) =>
        prev.filter((e) => e.id !== id),
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  })

  const addEvent = async (event: CoachEvent) => (await addEventMutation.mutateAsync(event)).id
  const updateEvent = async (id: string, event: CoachEvent) => {
    await updateEventMutation.mutateAsync({ id, event })
  }
  const deleteEvent = async (id: string) => {
    await deleteEventMutation.mutateAsync(id)
  }

  return {
    events,
    isLoading,
    error,
    addEvent,
    updateEvent,
    deleteEvent,
    refresh,
  }
}