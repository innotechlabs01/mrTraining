'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, SkipForward, ArrowRight, Flame } from 'lucide-react'
import { useLiveWorkout } from '../hooks/useLiveWorkout'
import { ExerciseStage } from './ExerciseStage'
import { RestTimer } from './RestTimer'
import { WorkoutProgress } from './WorkoutProgress'
import { CoachFeedback } from './CoachFeedback'
import { MusicPlayer } from './MusicPlayer'
import { CompletionScreen } from './CompletionScreen'
import { cn } from '@/lib/utils'

function LoadingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-1/2 rounded-lg bg-white/5" />
      <div className="h-2 w-full rounded-full bg-white/5" />
      <div className="aspect-[4/3] w-full rounded-3xl bg-white/5" />
      <div className="h-24 rounded-3xl bg-white/5" />
    </div>
  )
}

export function LiveWorkoutView() {
  const { plan, loading, state, totalSets, start, togglePause, skip, restart } = useLiveWorkout()

  if (loading || !plan) return <LoadingSkeleton />
  if (state.phase === 'complete') {
    return (
      <CompletionScreen
        planName={plan.name}
        elapsed={state.elapsed}
        completedSets={state.completedSets}
        totalSets={totalSets}
        totalExercises={plan.exercises.length}
        onRestart={restart}
      />
    )
  }

  const exercise = plan.exercises[state.exerciseIndex]
  const isIdle = state.phase === 'idle'
  const isWork = state.phase === 'work'
  const isRest = state.phase === 'rest'
  const isTransition = state.phase === 'transition'

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{plan.name}</h1>
          <p className="flex items-center gap-1.5 text-sm font-medium text-orange-400">
            <Flame className="h-3.5 w-3.5" />
            {plan.focus}
          </p>
        </div>
        <p className="text-[11px] text-white/30">{plan.coachName}</p>
      </motion.div>

      <WorkoutProgress
        plan={plan}
        exerciseIndex={state.exerciseIndex}
        elapsed={state.elapsed}
        completedSets={state.completedSets}
        totalSets={totalSets}
        phase={state.phase}
      />

      <AnimatePresence mode="wait">
        {isRest ? (
          <RestTimer key="rest" remaining={state.remaining} total={exercise.rest} cueText={state.coachMessage.text} />
        ) : (
          <ExerciseStage key={exercise.id} exercise={exercise} setIndex={state.setIndex} phase={state.phase} videoPlaying={isWork} />
        )}
      </AnimatePresence>

      {isTransition && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-3 text-center text-sm text-orange-300">
          Get ready — next exercise starting
        </motion.div>
      )}

      <CoachFeedback
        coachInitials={plan.coachInitials}
        coachName={plan.coachName}
        text={state.coachMessage.text}
        tone={state.coachMessage.tone}
        pulse={isWork}
      />

      <MusicPlayer playlist={plan.playlist} muted={isRest} />

      <div className="sticky bottom-0 pt-2">
        {isIdle ? (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={start}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 text-base font-semibold text-white shadow-lg shadow-orange-500/25 transition-transform active:scale-[0.98]"
          >
            <Play className="h-5 w-5" />
            Start Workout
          </motion.button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={togglePause}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold text-white transition-transform active:scale-[0.98]',
                state.isRunning ? 'bg-white/10' : 'bg-orange-500 shadow-lg shadow-orange-500/25',
              )}
            >
              {state.isRunning ? <><Pause className="h-5 w-5" />Pause</> : <><Play className="h-5 w-5" />Resume</>}
            </button>
            <button
              onClick={skip}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              {isRest ? 'Skip rest' : 'Skip'}
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {isWork && (
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/30">
          <ArrowRight className="h-3 w-3" />
          Follow the timer — complete each set, then recover
        </div>
      )}
    </div>
  )
}
