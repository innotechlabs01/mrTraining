'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ScheduleEvent, ScheduleStatus } from '../types'

const API_BASE = '/api/coaching/schedule'

export function useSchedule() {
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch(API_BASE)
        if (!res.ok) throw new Error('Failed to load schedule')
        const data = await res.json()
        if (mounted) {
          setEvents(data)
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error')
          setLoading(false)
        }
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const createEvent = useCallback(async (data: Omit<ScheduleEvent, 'id' | 'createdAt' | 'status'>) => {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to create event')
    const event = await res.json()
    setEvents(prev => [...prev, event])
    return event
  }, [])

  const updateStatus = useCallback(async (id: string, status: ScheduleStatus) => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) throw new Error('Failed to update status')
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
