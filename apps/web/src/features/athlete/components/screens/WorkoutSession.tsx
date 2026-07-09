'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Timer, ArrowRight, Dumbbell } from 'lucide-react'
import { useWorkout } from '@/features/athlete/hooks/useToday'
import { MOTIVATIONAL_MESSAGES } from '@/features/athlete/data/_mocks'
import { MUSCLE_GROUP_LABELS } from '@/features/workout'
import { cn } from '@/lib/utils'

function WorkoutSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 bg-white/5 rounded-xl w-1/2" />
      <div className="h-6 bg-white/5 rounded-lg w-1/3" />
      <div className="h-52 bg-white/5 rounded-2xl" />
      <div className="h-16 bg-white/5 rounded-xl" />
    </div>
  )
}

function ExerciseCard({
  name,
  sets,
  reps,
  weight,
  muscleGroups,
  notes,
  currentSet,
  totalSets,
  exerciseIndex,
  totalExercises,
}: {
  name: string; sets: number; reps: number; weight?: number
  muscleGroups?: string[]; notes?: string
  currentSet: number; totalSets: number
  exerciseIndex: number; totalExercises: number
}) {
  return (
    <motion.div
      key={`exercise-${exerciseIndex}-${currentSet}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-surface-1 rounded-2xl p-6 border border-white/5"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-white/40 font-medium">
          Exercise {exerciseIndex + 1} of {totalExercises}
        </span>
        <span className="text-xs text-white/30">
          Set {currentSet} of {totalSets}
        </span>
      </div>

      <h2 className="text-xl font-bold text-white mb-1">{name}</h2>
      {muscleGroups && muscleGroups.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {muscleGroups.map((mg) => (
            <span
              key={mg}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-white/40"
            >
              {MUSCLE_GROUP_LABELS[mg] ?? mg}
            </span>
          ))}
        </div>
      )}
      <p className="text-sm text-white/50">
        {reps} reps{weight ? ` @ ${weight}kg` : ''}
      </p>
      {notes && (
        <p className="text-xs text-white/30 mt-1 italic">{notes}</p>
      )}

      <div className="mt-5 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-orange-500 rounded-full"
          initial={{ width: `${((currentSet - 1) / totalSets) * 100}%` }}
          animate={{ width: `${(currentSet / totalSets) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <p className="text-[10px] text-white/30 mt-1.5 text-right">
        {Math.round((currentSet / totalSets) * 100)}%
      </p>
    </motion.div>
  )
}

function RestTimer({ remaining }: { remaining: number }) {
  const quote = useMemo(
    () => MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)],
    [],
  )
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-surface-1 rounded-2xl p-6 border border-white/5 text-center"
    >
      <motion.div
        key={remaining}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        className="flex items-center justify-center gap-2 mb-2"
      >
        <Timer className="w-4 h-4 text-orange-400" />
        <span className="text-xs text-orange-400 font-medium">Rest</span>
      </motion.div>
      <p className="text-4xl font-bold text-white tabular-nums mb-1">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </p>
      <p className="text-xs text-white/40 italic mt-2">&ldquo;{quote}&rdquo;</p>
    </motion.div>
  )
}

function CompletionCelebration({ onRestart }: { onRestart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      className="flex flex-col items-center justify-center py-10 text-center"
    >
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
      >
        <CheckCircle className="w-16 h-16 text-green-400 mb-5" />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-white mb-2"
      >
        Workout Complete!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-white/50 text-sm mb-6"
      >
        Great effort today. Another step closer to your goals.
      </motion.p>
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        onClick={onRestart}
        className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:text-white/80 transition-colors"
      >
        Restart Workout
      </motion.button>
    </motion.div>
  )
}

export default function WorkoutSession() {
  const { plan, progress, loading, error, completeSet, skipRest, restartWorkout } = useWorkout()

  if (loading) return <WorkoutSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-4xl mb-4">🏋️</span>
        <p className="text-red-400 text-sm mb-2">{error}</p>
        <p className="text-white/40 text-xs">Please try again</p>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Dumbbell className="w-10 h-10 text-white/20 mb-4" />
        <p className="text-white/50 text-sm">No workout scheduled today</p>
        <p className="text-white/30 text-xs mt-1">Enjoy your rest day</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-xl font-bold text-white">{plan.name}</h1>
        <p className="text-sm text-orange-400 font-medium">{plan.focus}</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {progress.phase === 'complete' ? (
          <CompletionCelebration onRestart={restartWorkout} />
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {plan.exercises[progress.currentExerciseIndex] && (
              <ExerciseCard
                {...plan.exercises[progress.currentExerciseIndex]}
                currentSet={progress.currentSet}
                totalSets={plan.exercises[progress.currentExerciseIndex].sets}
                exerciseIndex={progress.currentExerciseIndex}
                totalExercises={plan.exercises.length}
              />
            )}

            <AnimatePresence mode="wait">
              {progress.phase === 'rest' ? (
                <motion.div key="rest" className="space-y-3">
                  <RestTimer remaining={progress.restTimeRemaining} />
                  <button
                    onClick={skipRest}
                    className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm hover:text-white/70 transition-colors"
                  >
                    Skip rest
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="complete-btn"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={completeSet}
                  className={cn(
                    'w-full py-3.5 rounded-xl text-white font-semibold text-sm shadow-lg transition-all active:scale-[0.98]',
                    progress.currentSet < plan.exercises[progress.currentExerciseIndex].sets
                      ? 'bg-orange-500 shadow-orange-500/25 hover:bg-orange-400'
                      : 'bg-green-500 shadow-green-500/25 hover:bg-green-400'
                  )}
                >
                  <span className="flex items-center justify-center gap-2">
                    {progress.currentSet < plan.exercises[progress.currentExerciseIndex].sets
                      ? 'Complete Set'
                      : progress.currentExerciseIndex < plan.exercises.length - 1
                        ? 'Next Exercise'
                        : 'Finish Workout'}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </motion.button>
              )}
            </AnimatePresence>

            {progress.currentExerciseIndex < plan.exercises.length - 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-surface-1 rounded-xl p-4 border border-white/5"
              >
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Up Next</p>
                <p className="text-sm text-white font-medium">
                  {plan.exercises[progress.currentExerciseIndex + 1].name}
                </p>
              </motion.div>
            )}

            {plan.coachNote && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/10"
              >
                <p className="text-xs text-blue-400 font-medium mb-1">Coach Note</p>
                <p className="text-sm text-white/60">{plan.coachNote}</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
