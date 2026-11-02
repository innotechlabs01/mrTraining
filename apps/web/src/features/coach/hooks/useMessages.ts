'use client'

import { useQuery } from '@tanstack/react-query'
import type { MessageThread } from '../types'
import { coachingApi } from '@/features/shared/api/client'

export function useMessages() {
  const { data: threads = [], isLoading, error: queryError } = useQuery({
    queryKey: ['messages'],
    queryFn: () => coachingApi.getMessageThreads<MessageThread[]>(),
    staleTime: 30_000,
  })

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null

  const unreadCount = threads.filter(t => t.unread).length

  return {
    threads,
    unreadCount,
    isLoading,
    error,
  }
}