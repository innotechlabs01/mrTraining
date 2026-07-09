'use client'

import { useState, useEffect, useCallback } from 'react'
import { Workout, ScheduledWorkout, WorkoutHistoryEntry, WorkoutAnalytics } from '../types'
import { MOCK_WORKOUTS, MOCK_SCHEDULED_WORKOUTS, MOCK_HISTORY, MOCK_ANALYTICS } from '../data/_mocks'
import { generateId } from './helpers'

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
      id: generateId('wh'),
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
    const timer = setTimeout(() => {
      if (!mounted) return
      setScheduledWorkouts(MOCK_SCHEDULED_WORKOUTS)
      setLoading(false)
    }, 400)
    return () => { mounted = false; clearTimeout(timer) }
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
    await new Promise(r => setTimeout(r, 300))
    const scheduled: ScheduledWorkout = {
      id: generateId('sw'),
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
    await new Promise(r => setTimeout(r, 200))
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
    const timer = setTimeout(() => {
      if (!mounted) return
      setHistory(MOCK_HISTORY)
      setLoading(false)
    }, 400)
    return () => { mounted = false; clearTimeout(timer) }
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
    const timer = setTimeout(() => {
      if (!mounted) return
      setAnalytics(MOCK_ANALYTICS)
      setLoading(false)
    }, 500)
    return () => { mounted = false; clearTimeout(timer) }
  }, [])

  return {
    analytics,
    loading,
    error,
  }
}