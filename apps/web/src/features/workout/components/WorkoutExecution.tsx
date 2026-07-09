'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Workout, WorkoutExerciseDetail, WorkoutSet } from '../types'
import { formatDuration, WORKOUT_GOAL_LABELS } from '../hooks/helpers'
import { cn } from '@/lib/utils'
import {
  Play, Pause, RotateCcw, CheckCircle2, Clock, ChevronRight, ChevronLeft,
  Plus, Minus, Volume2, VolumeX, X, Send, Camera, MessageSquare,
  Trophy, Flame, Target, Zap
} from 'lucide-react'

interface WorkoutExecutionProps {
  workout: Workout
  onComplete?: (data: CompletionData) => void
  onCancel?: () => void
  className?: string
}

export interface CompletionData {
  rpe: number
  soreness: number
  energy: number
  notes: string
  exercises: Array<{
    exerciseId: string
    sets: Array<{
      setNumber: number
      actualReps?: number
      actualWeight?: number
      isCompleted: boolean
    }>
  }>
}

export function WorkoutExecution({
  workout,
  onComplete,
  onCancel,
  className,
}: WorkoutExecutionProps) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [workoutStartTime] = useState(new Date())
  const [isRunning, setIsRunning] = useState(true)
  const [restTimeRemaining, setRestTimeRemaining] = useState<number | null>(null)
  const [restTimeTotal, setRestTimeTotal] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [completionData, setCompletionData] = useState({
    rpe: 7,
    soreness: 5,
    energy: 7,
    notes: '',
  })
  const [exerciseStates, setExerciseStates] = useState<Map<string, WorkoutSet[]>>(new Map())

  const currentExercise = workout.exercises[currentExerciseIndex]
  const currentSets = exerciseStates.get(currentExercise?.id) || currentExercise?.sets || []

  const completedSets = useMemo(() => {
    let count = 0
    exerciseStates.forEach(sets => {
      sets.forEach(set => {
        if (set.isCompleted) count++
      })
    })
    return count
  }, [exerciseStates])

  const totalSets = useMemo(() => {
    return workout.exercises.reduce((acc, ex) => acc + ex.sets.length, 0)
  }, [workout.exercises])

  // Initialize exercise states
  useEffect(() => {
    const states = new Map<string, WorkoutSet[]>()
    workout.exercises.forEach(ex => {
      states.set(ex.id, ex.sets.map(set => ({ ...set })))
    })
    setExerciseStates(states)
  }, [workout])

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (isRunning && !restTimeRemaining) {
        setElapsedTime(prev => prev + 1)
      }
      if (restTimeRemaining && restTimeRemaining > 0) {
        setRestTimeRemaining(prev => prev! - 1)
      }
      if (restTimeRemaining === 0) {
        setRestTimeRemaining(null)
        setIsRunning(true)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, restTimeRemaining])

  const startRest = useCallback((seconds: number) => {
    setRestTimeTotal(seconds)
    setRestTimeRemaining(seconds)
    setIsRunning(false)
  }, [])

  const completeSet = useCallback((setIndex: number) => {
    if (!currentExercise) return

    const updatedStates = new Map(exerciseStates)
    const sets = updatedStates.get(currentExercise.id)!
    sets[setIndex] = {
      ...sets[setIndex],
      isCompleted: true,
      actualReps: sets[setIndex].targetReps === 'AMRAP' ? 10 : sets[setIndex].targetReps as number,
      actualWeight: sets[setIndex].targetWeight,
      completedAt: new Date().toISOString(),
    }
    setExerciseStates(updatedStates)

    // Start rest timer
    startRest(currentExercise.rest)

    // Move to next set or exercise
    if (setIndex < sets.length - 1) {
      // Move to next set (handled by UI)
    } else if (currentExerciseIndex < workout.exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1)
    }
  }, [currentExercise, currentExerciseIndex, exerciseStates, startRest, workout.exercises.length])

  const skipSet = useCallback((setIndex: number) => {
    if (!currentExercise) return

    const updatedStates = new Map(exerciseStates)
    const sets = updatedStates.get(currentExercise.id)!
    sets[setIndex] = {
      ...sets[setIndex],
      isSkipped: true,
      isCompleted: true,
    }
    setExerciseStates(updatedStates)
  }, [currentExercise, exerciseStates])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleComplete = () => {
    const data: CompletionData = {
      ...completionData,
      exercises: workout.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        sets: (exerciseStates.get(ex.id) || ex.sets).map((set, idx) => ({
          setNumber: idx + 1,
          actualReps: set.actualReps,
          actualWeight: set.actualWeight,
          isCompleted: set.isCompleted,
        })),
      })),
    }
    onComplete?.(data)
  }

  const handleFinish = () => {
    setShowCompletionModal(true)
  }

  return (
    <div className={cn('flex flex-col h-full bg-[#0A0B0D]', className)}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[#2A2A2C] bg-[#0F0F0F]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#FFFFFF]">{workout.name}</h1>
            <p className="text-sm text-[rgba(255,255,255,0.7)]">
              {WORKOUT_GOAL_LABELS[workout.goal]} • {formatDuration(workout.estimatedDuration)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Timer */}
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-[#FFFFFF]">
                {formatTime(elapsedTime)}
              </p>
              <div className="flex items-center gap-1 text-xs text-[rgba(255,255,255,0.4)]">
                <CheckCircle2 className={cn('w-3 h-3', completedSets === totalSets ? 'text-green-500' : '')} />
                <span>{completedSets}/{totalSets} sets</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rest Timer Overlay */}
      <AnimatePresence>
        {restTimeRemaining !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <div className="text-center">
              <p className="text-lg text-[rgba(255,255,255,0.7)] mb-2">Rest</p>
              <motion.p
                key={restTimeRemaining}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className={cn(
                  'text-8xl font-mono font-bold',
                  restTimeRemaining <= 10 ? 'text-red-500' :
                  restTimeRemaining <= 30 ? 'text-amber-500' :
                  'text-white'
                )}
              >
                {formatTime(restTimeRemaining)}
              </motion.p>
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => setRestTimeRemaining(r => r! + 30)}
                  className="p-3 rounded-full bg-[#1C1C1C] text-[#FFFFFF] hover:bg-[#242426] transition-colors"
                >
                  <Plus className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setRestTimeRemaining(r => Math.max(0, r! - 15))}
                  disabled={restTimeRemaining <= 15}
                  className="p-3 rounded-full bg-[#1C1C1C] text-[#FFFFFF] hover:bg-[#242426] transition-colors disabled:opacity-50"
                >
                  <Minus className="w-6 h-6" />
                </button>
                <button
                  onClick={() => {
                    setRestTimeRemaining(null)
                    setIsRunning(true)
                  }}
                  className="px-6 py-3 rounded-full bg-[#FF6B00] text-white font-semibold"
                >
                  Skip Rest
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {currentExercise && (
          <motion.div
            key={currentExercise.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Exercise Header */}
            <div className="text-center">
              <p className="text-sm text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-1">
                Exercise {currentExerciseIndex + 1} of {workout.exercises.length}
              </p>
              <h2 className="text-2xl font-bold text-[#FFFFFF]">
                {currentExercise.exerciseName}
              </h2>
              <p className="text-sm text-[rgba(255,255,255,0.7)] mt-1">
                {currentExercise.sets.length} sets × {currentExercise.sets[0]?.targetReps} reps • Rest {currentExercise.rest}s
              </p>
            </div>

            {/* Sets */}
            <div className="space-y-3">
              {currentSets.map((set, setIndex) => {
                const isCompleted = set.isCompleted
                const isCurrent = setIndex === currentSets.findIndex(s => !s.isCompleted)

                return (
                  <motion.div
                    key={set.id}
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.02 : 1,
                      borderColor: isCurrent ? '#FF6B00' : '#2A2A2C',
                    }}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all',
                      isCompleted
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-[#1A1A1C] border-[#2A2A2C]',
                      isCurrent && 'ring-2 ring-[#FF6B00]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold',
                          isCompleted ? 'bg-green-500 text-white' : 'bg-[#1C1C1C] text-[rgba(255,255,255,0.7)]'
                        )}>
                          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : setIndex + 1}
                        </span>
                        <div>
                          <p className="font-medium text-[#FFFFFF]">
                            Set {setIndex + 1} {set.setType !== 'working' && `(${set.setType})`}
                          </p>
                          <p className="text-sm text-[rgba(255,255,255,0.7)]">
                            {set.targetReps === 'AMRAP' ? 'AMRAP' : `${set.targetReps} reps`}
                            {set.targetWeight && ` × ${set.targetWeight} kg`}
                            {set.targetRpe && ` @ RPE ${set.targetRpe}`}
                          </p>
                        </div>
                      </div>
                      {!isCompleted && isCurrent && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => skipSet(setIndex)}
                            className="px-3 py-1.5 text-sm text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)]"
                          >
                            Skip
                          </button>
                          <button
                            onClick={() => completeSet(setIndex)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                          >
                            Complete
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Notes */}
            <div className="flex justify-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1C] text-[rgba(255,255,255,0.7)] hover:bg-[#1C1C1C] transition-colors">
                <MessageSquare className="w-4 h-4" />
                Add Note
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1C] text-[rgba(255,255,255,0.7)] hover:bg-[#1C1C1C] transition-colors">
                <Camera className="w-4 h-4" />
                Add Photo
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-shrink-0 p-4 border-t border-[#2A2A2C] bg-[#0F0F0F]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentExerciseIndex(prev => Math.max(0, prev - 1))}
            disabled={currentExerciseIndex === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[rgba(255,255,255,0.7)] hover:bg-[#1A1A1C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          {completedSets === totalSets ? (
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 px-6 py-3 bg-[#FF6B00] text-white rounded-lg font-semibold hover:bg-[#FF6B00]/90 transition-colors"
            >
              <Trophy className="w-5 h-5" />
              Finish Workout
            </button>
          ) : (
            <button
              onClick={() => setCurrentExerciseIndex(prev => Math.min(workout.exercises.length - 1, prev + 1))}
              disabled={currentExerciseIndex === workout.exercises.length - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[rgba(255,255,255,0.7)] hover:bg-[#1A1A1C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Completion Modal */}
      <AnimatePresence>
        {showCompletionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[#141416] rounded-xl border border-[#2A2A2C] p-6"
            >
              <div className="text-center mb-6">
                <Trophy className="w-16 h-16 text-amber-500 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-[#FFFFFF]">Workout Complete!</h2>
                <p className="text-[rgba(255,255,255,0.7)]">
                  {formatTime(elapsedTime)} • {completedSets}/{totalSets} sets completed
                </p>
              </div>

              <div className="space-y-5">
                {/* RPE */}
                <div>
                  <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)] mb-2">
                    How hard was it? (RPE)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={completionData.rpe}
                    onChange={(e) => setCompletionData(prev => ({ ...prev, rpe: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-[#1C1C1C] rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
                  />
                  <div className="flex justify-between text-xs text-[rgba(255,255,255,0.4)] mt-1">
                    <span>Easy</span>
                    <span className="font-bold text-[#FF6B00]">{completionData.rpe}</span>
                    <span>Max</span>
                  </div>
                </div>

                {/* Soreness */}
                <div>
                  <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)] mb-2">
                    Soreness Level
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={completionData.soreness}
                    onChange={(e) => setCompletionData(prev => ({ ...prev, soreness: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-[#1C1C1C] rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
                  />
                  <div className="flex justify-between text-xs text-[rgba(255,255,255,0.4)] mt-1">
                    <span>None</span>
                    <span className="font-bold text-[#FF6B00]">{completionData.soreness}</span>
                    <span>Very Sore</span>
                  </div>
                </div>

                {/* Energy */}
                <div>
                  <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)] mb-2">
                    Energy Level
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={completionData.energy}
                    onChange={(e) => setCompletionData(prev => ({ ...prev, energy: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-[#1C1C1C] rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
                  />
                  <div className="flex justify-between text-xs text-[rgba(255,255,255,0.4)] mt-1">
                    <span>Exhausted</span>
                    <span className="font-bold text-[#FF6B00]">{completionData.energy}</span>
                    <span>Energized</span>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)] mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={completionData.notes}
                    onChange={(e) => setCompletionData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="How did the workout feel? Any observations?"
                    className="w-full h-24 px-4 py-3 rounded-lg bg-[#1A1A1C] border border-[#2A2A2C] text-[#FFFFFF] placeholder-[rgba(255,255,255,0.4)] resize-none focus:outline-none focus:border-[#0066FF]"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCompletionModal(false)}
                  className="flex-1 py-3 rounded-lg border border-[#2A2A2C] text-[rgba(255,255,255,0.7)] hover:bg-[#1A1A1C] transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 py-3 rounded-lg bg-[#FF6B00] text-white font-semibold hover:bg-[#FF6B00]/90 transition-colors"
                >
                  Save Workout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}