'use client'

import { useState, useEffect } from 'react'
import type { MessageThread } from '../types'
import { coachingApi } from '@/features/shared/api/client'

export function useMessages() {
  const [threads, setThreads] = useState<MessageThread[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    coachingApi.getMessageThreads<MessageThread[]>()
      .then(data => setThreads(data))
      .catch(() => setError('Failed to load messages'))
      .finally(() => setIsLoading(false))
  }, [])

  const unreadCount = threads.filter(t => t.unread).length

  return {
    threads,
    unreadCount,
    isLoading,
    error,
  }
}
