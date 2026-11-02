'use client'

import { useState, useEffect, useCallback } from 'react'
import { Workout, ScheduledWorkout, WorkoutHistoryEntry, WorkoutAnalytics } from '../types'

const API_BASE = '/api/coaching'

export function useWorkoutExecution() {
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Start a workout
  const startWorkout = useCallback((workout: Workout) => {
    setCurrentWorkout({ ...workout, status: 'in_progress' })
    setIsExecuting(true)
    setStartTime(new Date())
    setElapsedSeconds(0)
  }, [])

  // Pause/Resume
  const pauseWorkout = useCallback(() => {
    setIsExecuting(false)
  }, [])

  const resumeWorkout = useCallback(() => {
    setIsExecuting(true)
  }, [])

  // Cancel workout
  const cancelWorkout = useCallback(() => {
    setCurrentWorkout(null)
    setIsExecuting(false)
    setStartTime(null)
    setElapsedSeconds(0)
  }, [])

  // Complete workout
  const completeWorkout = useCallback((completionData: {
    rpe: number
    soreness: number
    energy: number
    notes: string
  }) => {
    if (!currentWorkout || !startTime) return null

    const completedAt = new Date()
    const duration = Math.round((completedAt.getTime() - startTime.getTime()) / 60000)

    const historyEntry: WorkoutHistoryEntry = {
      id: `wh-${Date.now()}`,
      workoutId: currentWorkout.id,
      workoutName: currentWorkout.name,
      date: completedAt.toISOString().split('T')[0],
      duration,
      status: 'completed',
      totalVolume: 0,
      exercisesCompleted: currentWorkout.exercises.length,
      exercisesTotal: currentWorkout.exercises.length,
      rpe: completionData.rpe,
      soreness: completionData.soreness,
      energy: completionData.energy,
      notes: completionData.notes,
      tags: currentWorkout.tags,
    }

    // Reset state
    setCurrentWorkout(null)
    setIsExecuting(false)
    setStartTime(null)
    setElapsedSeconds(0)

    return historyEntry
  }, [currentWorkout, startTime])

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isExecuting && startTime) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime.getTime()) / 1000))
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isExecuting, startTime])

  return {
    currentWorkout,
    isExecuting,
    startTime,
    elapsedSeconds,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    cancelWorkout,
    completeWorkout,
  }
}

export function useScheduledWorkouts() {
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/scheduled-workouts`)
        if (!res.ok) throw new Error('Failed to load scheduled workouts')
        const data = await res.json()
        if (mounted) {
          setScheduledWorkouts(data)
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

  // Get today's scheduled workouts
  const todaysWorkouts = scheduledWorkouts.filter(sw => {
    const today = new Date().toISOString().split('T')[0]
    return sw.scheduledDate === today
  })

  // Get upcoming workouts
  const upcomingWorkouts = scheduledWorkouts.filter(sw => {
    const today = new Date().toISOString().split('T')[0]
    return sw.scheduledDate > today && sw.status !== 'completed'
  })

  const scheduleWorkout = useCallback(async (workout: Workout, athleteId: string, athleteName: string, date: string, time?: string) => {
    const res = await fetch(`${API_BASE}/assigned-workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workout, athleteId, athleteName, scheduledDate: date, scheduledTime: time }),
    })
    if (!res.ok) throw new Error('Failed to schedule workout')
    const result = await res.json()
    const scheduled: ScheduledWorkout = {
      id: result.id,
      workout,
      athleteId,
      athleteName,
      scheduledDate: date,
      scheduledTime: time,
      status: 'scheduled',
      reminderSent: false,
    }
    setScheduledWorkouts(prev => [...prev, scheduled])
    return scheduled
  }, [])

  const updateScheduledStatus = useCallback(async (id: string, status: ScheduledWorkout['status']) => {
    const res = await fetch(`${API_BASE}/assigned-workouts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) throw new Error('Failed to update status')
    setScheduledWorkouts(prev => prev.map(sw =>
      sw.id === id ? { ...sw, status } : sw
    ))
  }, [])

  return {
    scheduledWorkouts,
    todaysWorkouts,
    upcomingWorkouts,
    loading,
    error,
    scheduleWorkout,
    updateScheduledStatus,
  }
}

export function useWorkoutHistory() {
  const [history, setHistory] = useState<WorkoutHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/workout-history`)
        if (!res.ok) throw new Error('Failed to load workout history')
        const data = await res.json()
        if (mounted) {
          setHistory(data)
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

  const addHistoryEntry = useCallback((entry: WorkoutHistoryEntry) => {
    setHistory(prev => [entry, ...prev])
  }, [])

  const getHistoryByDateRange = useCallback((from: string, to: string) => {
    return history.filter(h => h.date >= from && h.date <= to)
  }, [history])

  return {
    history,
    loading,
    error,
    addHistoryEntry,
    getHistoryByDateRange,
  }
}

export function useWorkoutAnalytics() {
  const [analytics, setAnalytics] = useState<WorkoutAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/workout-analytics`)
        if (!res.ok) throw new Error('Failed to load workout analytics')
        const data = await res.json()
        if (mounted) {
          setAnalytics(data)
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

  return {
    analytics,
    loading,
    error,
  }
}
