'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AthleteBlockId, AthleteTimeBlock, MorningData } from '../types'
import { MOCK_TIME_BLOCKS, MOCK_MORNING } from '../data/_mocks'

export function useRecovery() {
  const [stretches, setStretches] = useState<{ id: string; name: string; duration: number; completed: boolean }[]>([])
  const [sleepHours, setSleepHours] = useState<number | null>(null)
  const [sleepQuality, setSleepQuality] = useState<string>('unknown')
  const [hrv, setHrv] = useState<number | null>(null)
  const [stress, setStress] = useState<number | null>(null)
  const [hydration, setHydration] = useState<number | null>(null)
  const [recoveryScore, setRecoveryScore] = useState<number | null>(null)
  const [aiRec, setAiRec] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const timer = setTimeout(() => {
      if (!mounted) return
      setStretches([
        { id: 'st-1', name: 'Hamstring Stretch', duration: 30, completed: false },
        { id: 'st-2', name: 'Quad Stretch', duration: 30, completed: false },
        { id: 'st-3', name: 'Hip Flexor Stretch', duration: 45, completed: false },
        { id: 'st-4', name: 'Glute Bridge Hold', duration: 30, completed: false },
        { id: 'st-5', name: 'Calf Stretch', duration: 30, completed: false },
      ])
      setSleepHours(7.4)
      setSleepQuality('good')
      setHrv(50)
      setStress(30)
      setHydration(80)
      setRecoveryScore(78)
      setAiRec('Rest 2-3 more hours and add a light cardio session tomorrow.')
      setLoading(false)
    }, 600)
    return () => { mounted = false; clearTimeout(timer) }
  }, [])

  const toggleStretch = useCallback((id: string) => {
    setStretches(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s))
  }, [])

  const allDone = stretches.length > 0 && stretches.every(s => s.completed)

  return { stretches, sleepHours, sleepQuality, hrv, stress, hydration, recoveryScore, aiRec, loading, error, toggleStretch, allDone }
}

// ============ Athlete Day (timeline navigation) ============
export function useAthleteDay() {
  const [currentBlock, setCurrentBlock] = useState<AthleteBlockId>('morning')
  const blocks = MOCK_TIME_BLOCKS
  return { blocks, currentBlock, navigateBlock: setCurrentBlock, setCurrentBlock }
}

// ============ Morning Check-in ============
export function useMorning() {
  const [data, setData] = useState<MorningData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setData(MOCK_MORNING)
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return { data, loading, error }
}

// ============ Workout Execution (in-session) ============
type WorkoutPhase = 'work' | 'rest' | 'complete'

export function useWorkout() {
  const [plan, setPlan] = useState<typeof MOCK_MORNING.todayWorkout | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<WorkoutPhase>('work')
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [restTimeRemaining, setRestTimeRemaining] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setPlan(MOCK_MORNING.todayWorkout)
      setLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (phase !== 'rest' || restTimeRemaining <= 0) return
    const id = setInterval(() => {
      setRestTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id)
          setPhase('work')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [phase, restTimeRemaining])

  const completeSet = useCallback(() => {
    if (!plan) return
    if (phase === 'rest') {
      setPhase('work')
      setRestTimeRemaining(0)
      return
    }
    const exercise = plan.exercises[currentExerciseIndex]
    if (currentSet < exercise.sets) {
      setCurrentSet(currentSet + 1)
      setPhase('rest')
      setRestTimeRemaining(exercise.rest)
    } else if (currentExerciseIndex < plan.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1)
      setCurrentSet(1)
      setPhase('work')
    } else {
      setPhase('complete')
    }
  }, [plan, phase, currentSet, currentExerciseIndex])

  const skipRest = useCallback(() => {
    setPhase('work')
    setRestTimeRemaining(0)
  }, [])

  const restartWorkout = useCallback(() => {
    setPhase('work')
    setCurrentExerciseIndex(0)
    setCurrentSet(1)
    setRestTimeRemaining(0)
  }, [])

  return {
    plan,
    progress: { phase, currentExerciseIndex, currentSet, restTimeRemaining },
    loading,
    error,
    completeSet,
    skipRest,
    restartWorkout,
  }
}
