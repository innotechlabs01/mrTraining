'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ScheduleEvent, ScheduleStatus } from '../types'
import { MOCK_SCHEDULE_EVENTS } from '../data/_mocks'
import { generateId } from './helpers'

export function useSchedule() {
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const timer = setTimeout(() => {
      if (!mounted) return
      setEvents(MOCK_SCHEDULE_EVENTS)
      setLoading(false)
    }, 500)
    return () => { mounted = false; clearTimeout(timer) }
  }, [])

  const createEvent = useCallback(async (data: Omit<ScheduleEvent, 'id' | 'createdAt' | 'status'>) => {
    await new Promise(r => setTimeout(r, 300))
    const event: ScheduleEvent = { ...data, id: generateId('se'), status: 'draft', createdAt: new Date().toISOString().split('T')[0] }
    setEvents(prev => [...prev, event])
    return event
  }, [])

  const updateStatus = useCallback(async (id: string, status: ScheduleStatus) => {
    await new Promise(r => setTimeout(r, 200))
    setEvents(prev => prev.map(e => e.id === id ? { ...e, status } : e))
  }, [])

  const publishEvent = useCallback(async (id: string) => {
    return updateStatus(id, 'published')
  }, [updateStatus])

  const cancelEvent = useCallback(async (id: string) => {
    return updateStatus(id, 'cancelled')
  }, [updateStatus])

  return { events, loading, error, createEvent, updateStatus, publishEvent, cancelEvent }
}
