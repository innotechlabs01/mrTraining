'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { LIVE_WORKOUT_PLAN, LIVE_MOTIVATIONAL_LINES } from '../data/_mocks'
import type { CueTone, LiveCoachCue, LiveWorkoutPlan, LivePhase } from '../types'

const TRANSITION_SEC = 8

interface CoachMessage {
  text: string
  tone: CueTone
}

interface LiveState {
  phase: LivePhase
  exerciseIndex: number
  pendingExerciseIndex: number
  setIndex: number
  remaining: number
  isRunning: boolean
  elapsed: number
  completedSets: number
  coachMessage: CoachMessage
}

interface LiveWorkoutApi {
  plan: LiveWorkoutPlan | null
  loading: boolean
  state: LiveState
  totalSets: number
  start: () => void
  togglePause: () => void
  skip: () => void
  restart: () => void
}

function pickCue(cues: LiveCoachCue[], fallback: string, prefer?: CueTone): LiveCoachCue {
  if (cues.length === 0) return { id: 'fb', tone: 'motivation', text: fallback }
  if (prefer) {
    const match = cues.find((c) => c.tone === prefer)
    if (match) return match
  }
  return cues[Math.floor(Math.random() * cues.length)]
}

function buildInitial(plan: LiveWorkoutPlan): LiveState {
  const first = plan.exercises[0]
  return {
    phase: 'idle',
    exerciseIndex: 0,
    pendingExerciseIndex: 0,
    setIndex: 1,
    remaining: first.duration,
    isRunning: false,
    elapsed: 0,
    completedSets: 0,
    coachMessage: { text: 'Ready when you are. Tap start.', tone: 'motivation' },
  }
}

function advance(prev: LiveState, plan: LiveWorkoutPlan): LiveState {
  const exercise = plan.exercises[prev.exerciseIndex]
  const nextRemaining = prev.remaining - 1

  if (nextRemaining > 0) {
    return { ...prev, remaining: nextRemaining, elapsed: prev.elapsed + 1 }
  }

  // A phase just ended.
  if (prev.phase === 'work') {
    const completedSets = prev.completedSets + 1
    if (prev.setIndex < exercise.sets) {
      const body = pickCue(exercise.cues, 'Breathe. Reset. Next set.', 'motivation')
      return {
        ...prev,
        completedSets,
        phase: 'rest',
        remaining: exercise.rest || 1,
        coachMessage: { text: body.text, tone: body.tone },
      }
    }
    // Last set of this exercise.
    if (prev.exerciseIndex < plan.exercises.length - 1) {
      const next = prev.exerciseIndex + 1
      const nextEx = plan.exercises[next]
      return {
        ...prev,
        completedSets,
        phase: 'transition',
        pendingExerciseIndex: next,
        remaining: TRANSITION_SEC,
        coachMessage: { text: `Up next: ${nextEx.name}`, tone: 'tip' },
      }
    }
    return { ...prev, completedSets, phase: 'complete', remaining: 0, isRunning: false, coachMessage: { text: 'Workout complete. Outstanding work.', tone: 'praise' } }
  }

  if (prev.phase === 'rest') {
    const body = pickCue(exercise.cues, `Set ${prev.setIndex + 1}. Let’s move.`, 'tip')
    return {
      ...prev,
      phase: 'work',
      setIndex: prev.setIndex + 1,
      remaining: exercise.duration,
      coachMessage: { text: body.text, tone: body.tone },
    }
  }

  // transition -> begin next exercise
  const nextEx = plan.exercises[prev.pendingExerciseIndex]
  const body = pickCue(nextEx.cues, `Start: ${nextEx.name}`, 'tip')
  return {
    ...prev,
    phase: 'work',
    exerciseIndex: prev.pendingExerciseIndex,
    setIndex: 1,
    remaining: nextEx.duration,
    coachMessage: { text: body.text, tone: body.tone },
  }
}

export function useLiveWorkout(): LiveWorkoutApi {
  const [plan, setPlan] = useState<LiveWorkoutPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<LiveState>(() => buildInitial(LIVE_WORKOUT_PLAN))
  const planRef = useRef<LiveWorkoutPlan | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      planRef.current = LIVE_WORKOUT_PLAN
      setPlan(LIVE_WORKOUT_PLAN)
      setState(buildInitial(LIVE_WORKOUT_PLAN))
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const isActive =
    state.isRunning && (state.phase === 'work' || state.phase === 'rest' || state.phase === 'transition')

  useEffect(() => {
    if (!isActive || !planRef.current) return
    const plan = planRef.current
    const id = setInterval(() => {
      setState((prev) => advance(prev, plan))
    }, 1000)
    return () => clearInterval(id)
  }, [isActive])

  const start = useCallback(() => {
    if (!planRef.current) return
    setState((prev) =>
      prev.phase === 'idle'
        ? { ...prev, phase: 'work', isRunning: true, remaining: planRef.current!.exercises[0].duration }
        : { ...prev, isRunning: true },
    )
  }, [])

  const togglePause = useCallback(() => {
    setState((prev) => ({ ...prev, isRunning: !prev.isRunning }))
  }, [])

  const skip = useCallback(() => {
    if (!planRef.current) return
    setState((prev) => {
      const plan = planRef.current!
      // Reuse the transition logic from a zero-remaining tick.
      if (prev.phase === 'work' || prev.phase === 'rest' || prev.phase === 'transition') {
        return advance({ ...prev, remaining: 1 }, plan)
      }
      return prev
    })
  }, [])

  const restart = useCallback(() => {
    if (!planRef.current) return
    setState(buildInitial(planRef.current))
  }, [])

  const totalSets = plan ? plan.exercises.reduce((sum, e) => sum + e.sets, 0) : 0

  // Keep a little life in the coach feedback during long holds.
  const motivationRef = useRef(0)
  useEffect(() => {
    if (state.phase !== 'work' || !state.isRunning) return
    const id = setInterval(() => {
      motivationRef.current = (motivationRef.current + 1) % LIVE_MOTIVATIONAL_LINES.length
      setState((prev) => {
        if (prev.phase !== 'work') return prev
        return { ...prev, coachMessage: { text: LIVE_MOTIVATIONAL_LINES[motivationRef.current], tone: 'motivation' } }
      })
    }, 9000)
    return () => clearInterval(id)
  }, [state.phase, state.isRunning])

  return { plan, loading, state, totalSets, start, togglePause, skip, restart }
}
