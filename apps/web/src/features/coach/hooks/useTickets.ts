'use client'

import { useState, useEffect } from 'react'
import type { SupportTicket } from '../types'
import { coachingApi } from '@/features/shared/api/client'

export function useTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTickets = () => {
    setIsLoading(true)
    coachingApi.getTickets<SupportTicket[]>()
      .then(data => setTickets(data))
      .catch(() => setError('Failed to load tickets'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadTickets()
  }, [])

  const addTicket = async (ticket: SupportTicket) => {
    return coachingApi.saveTicket<{ id: string }>(ticket).then(res => {
      setTickets(prev => [...prev, { ...ticket, id: res.id }])
      return res.id
    })
  }

  return {
    tickets,
    isLoading,
    error,
    addTicket,
    refresh: loadTickets,
  }
}
