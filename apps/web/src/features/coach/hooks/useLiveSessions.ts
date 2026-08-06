'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LiveSessionItem, LiveSessionStatus } from '@/features/coach/types'
import { coachingApi } from '@/features/shared/api/client'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export interface NewLiveSessionInput {
  title: string
  description?: string
  date: string
  startTime: string
  endTime: string
  modality: LiveSessionItem['modality']
  location?: string
  notes?: string
  public: boolean
  capacity: number
  link?: string
  distanceKm?: number
  pace?: string
}

export function effectiveStatus(s: LiveSessionItem, now: Date = new Date()): LiveSessionStatus {
  if (s.status === 'cancelled') return 'cancelled'
  if (s.status === 'completed') return 'completed'
  const start = new Date(`${s.date}T${s.startTime}`)
  const end = new Date(`${s.date}T${s.endTime}`)
  if (now < start) return 'scheduled'
  if (now > end) return 'completed'
  return 'live'
}

export function overlaps(
  sessions: LiveSessionItem[],
  date: string,
  startTime: string,
  endTime: string,
  ignoreId?: string,
): boolean {
  const start = new Date(`${date}T${startTime}`).getTime()
  const end = new Date(`${date}T${endTime}`).getTime()
  if (end <= start) return false
  return sessions.some((s) => {
    if (s.id === ignoreId || s.date !== date || s.status === 'cancelled') return false
    const sStart = new Date(`${s.date}T${s.startTime}`).getTime()
    const sEnd = new Date(`${s.date}T${s.endTime}`).getTime()
    return start < sEnd && end > sStart
  })
}

export function useLiveSessions() {
  const [sessions, setSessions] = useState<LiveSessionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadSessions = useCallback(() => {
    setIsLoading(true)
    coachingApi.getLiveSessions<LiveSessionItem[]>()
      .then(data => setSessions(data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const addSession = useCallback(
    async (input: NewLiveSessionInput) => {
      const session: Partial<LiveSessionItem> = { enrolled: 0, status: 'scheduled', ...input }
      const res = await coachingApi.saveLiveSession<{ id: string }>(session)
      setSessions(prev => [...prev, { ...session, id: res.id } as LiveSessionItem].sort((a, b) =>
        a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)
      ))
      return { ...session, id: res.id } as LiveSessionItem
    },
    [],
  )

  const updateSession = useCallback(
    async (id: string, patch: Partial<LiveSessionItem>) => {
      const current = sessions.find(s => s.id === id)
      if (!current) return
      const updated = { ...current, ...patch }
      await coachingApi.updateLiveSession(id, updated)
      setSessions(prev => prev.map(s => s.id === id ? updated : s))
    },
    [sessions],
  )

  const removeSession = useCallback(
    async (id: string) => {
      await coachingApi.deleteLiveSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
    },
    [],
  )

  const setEnrolled = useCallback(
    async (id: string, value: number) => {
      const target = sessions.find(s => s.id === id)
      if (!target) return
      const clamped = Math.max(0, Math.min(value, target.capacity))
      await updateSession(id, { enrolled: clamped })
    },
    [sessions, updateSession],
  )

  const sessionsForDate = useCallback(
    (date: string) =>
      sessions
        .filter((s) => s.date === date)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [sessions],
  )

  return { sessions, isLoading, addSession, updateSession, removeSession, setEnrolled, sessionsForDate, todayISO }
}
