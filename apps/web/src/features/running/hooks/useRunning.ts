'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getRunningSessions,
  getRunningSession,
  getRunningStats,
  updateRunningSession,
  deleteRunningSession,
  logGpsBatch,
  type RunningSession,
  type RunningStats,
  type RunningSessionDetail,
} from '@/features/shared/api/client'

/** Paginated running history for the authenticated user. */
export function useRunningSessions(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['running', 'sessions', page, limit],
    queryFn: () => getRunningSessions(page, limit),
    staleTime: 30_000,
  })
}

/** Aggregated running stats (total distance, sessions, avg pace…). */
export function useRunningStats() {
  return useQuery({
    queryKey: ['running', 'stats'],
    queryFn: () => getRunningStats(),
    staleTime: 60_000,
  })
}

/** Single session with its GPS points. */
export function useRunningSession(id: string) {
  return useQuery({
    queryKey: ['running', 'session', id],
    queryFn: () => getRunningSession(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}

/** Close a live-tracked run with final totals; invalidates list + stats. */
export function useUpdateRunningSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateRunningSession>[1] }) =>
      updateRunningSession(id, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['running'] })
      void qc.invalidateQueries({ queryKey: ['running', 'session', id] })
    },
  })
}

/** Delete a session; invalidates list + stats. */
export function useDeleteRunningSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteRunningSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['running'] })
    },
  })
}

/** Send a batch of GPS points to live-location. */
export function useSendGpsBatch(sessionId: string) {
  return useMutation({
    mutationFn: (points: Parameters<typeof logGpsBatch>[1]) =>
      logGpsBatch(sessionId, points),
  })
}

export type { RunningSession, RunningStats, RunningSessionDetail }
