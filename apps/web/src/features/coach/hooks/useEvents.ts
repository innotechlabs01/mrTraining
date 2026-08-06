'use client'

import { useState, useEffect } from 'react'
import type { CoachEvent } from '../types'
import { coachingApi } from '@/features/shared/api/client'

export function useEvents() {
  const [events, setEvents] = useState<CoachEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEvents = () => {
    setIsLoading(true)
    coachingApi.getEvents<CoachEvent[]>()
      .then(data => setEvents(data))
      .catch(() => setError('Failed to load events'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const addEvent = async (event: CoachEvent) => {
    return coachingApi.saveEvent<{ id: string }>(event).then(res => {
      setEvents(prev => [...prev, { ...event, id: res.id }])
      return res.id
    })
  }

  const updateEvent = async (id: string, event: CoachEvent) => {
    return coachingApi.updateEvent<{ ok: boolean }>(id, event).then(() => {
      setEvents(prev => prev.map(e => e.id === id ? { ...event, id } : e))
    })
  }

  const deleteEvent = async (id: string) => {
    return coachingApi.deleteEvent<{ ok: boolean }>(id).then(() => {
      setEvents(prev => prev.filter(e => e.id !== id))
    })
  }

  return {
    events,
    isLoading,
    error,
    addEvent,
    updateEvent,
    deleteEvent,
    refresh: loadEvents,
  }
}
