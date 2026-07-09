'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Video, Lightbulb, Play } from 'lucide-react'
import type { LiveExercise, LivePhase } from '../types'
import { cn } from '@/lib/utils'

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps',
  triceps: 'Triceps', legs: 'Legs', glutes: 'Glutes', hamstrings: 'Hamstrings',
  quads: 'Quads', calves: 'Calves', core: 'Core', full_body: 'Full Body',
}

interface ExerciseStageProps {
  exercise: LiveExercise
  setIndex: number
  phase: LivePhase
  videoPlaying: boolean
}

export function ExerciseStage({ exercise, setIndex, phase, videoPlaying }: ExerciseStageProps) {
  const [videoFailed, setVideoFailed] = useState(false)
  const showVideo = exercise.videoUrl && !videoFailed
  const isWork = phase === 'work'

  return (
    <motion.div
      key={exercise.id}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-surface-2 border border-white/5"
    >
      {showVideo ? (
        <video
          className={cn('h-full w-full object-cover', videoPlaying ? 'opacity-100' : 'opacity-40')}
          src={exercise.videoUrl}
          autoPlay={isWork}
          muted
          loop
          playsInline
          onError={() => setVideoFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-orange-500/20 via-surface-2 to-surface-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-500/15 animate-glow-pulse">
            <Video className="h-9 w-9 text-orange-400" />
          </div>
          <p className="text-sm text-white/40">Demo video</p>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-surface-0/90 via-surface-0/10 to-transparent" />

      <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4">
        <span className="rounded-full bg-surface-0/60 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white/70 backdrop-blur">
          {exercise.section === 'warmup' ? 'Warm-Up' : exercise.section === 'cooldown' ? 'Cool Down' : 'Working Set'}
        </span>
        {exercise.sets > 1 && (
          <span className="rounded-full bg-surface-0/60 px-3 py-1 text-[11px] font-medium text-white/70 backdrop-blur">
            Set {setIndex} / {exercise.sets}
          </span>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 space-y-2 p-4">
        <h2 className="text-2xl font-bold tracking-tight text-white">{exercise.name}</h2>
        <div className="flex flex-wrap gap-1.5">
          {exercise.muscleGroups.map((mg) => (
            <span key={mg} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/60">
              {MUSCLE_LABELS[mg] ?? mg}
            </span>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {exercise.formTips.length > 0 && (
            <motion.div
              key={exercise.formTips[0]}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-start gap-2 rounded-xl bg-surface-0/50 p-2.5 backdrop-blur"
            >
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
              <p className="text-xs text-white/70">{exercise.formTips[0]}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!isWork && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <Play className="h-8 w-8 text-white/20" />
        </div>
      )}
    </motion.div>
  )
}
