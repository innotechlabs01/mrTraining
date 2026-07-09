'use client'

import { useMemo } from 'react'
import type { MessageThread } from '../types'
import { MOCK_MESSAGE_THREADS } from '../data/_mocks'

export function useMessages() {
  const threads = useMemo(() => MOCK_MESSAGE_THREADS, [])

  const unreadCount = useMemo(
    () => threads.filter((t) => t.unread).length,
    [threads],
  )

  const getThreadById = (id: string): MessageThread | undefined =>
    threads.find((t) => t.id === id)

  return {
    threads,
    unreadCount,
    getThreadById,
    isLoading: false,
    error: null,
  }
}
