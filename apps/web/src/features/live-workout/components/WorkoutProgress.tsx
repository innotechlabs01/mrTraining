'use client'

import { motion } from 'framer-motion'
import { Clock, Check } from 'lucide-react'
import type { LiveWorkoutPlan } from '../types'

interface WorkoutProgressProps {
  plan: LiveWorkoutPlan
  exerciseIndex: number
  elapsed: number
  completedSets: number
  totalSets: number
  phase: string
}

function formatClock(totalSec: number) {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function WorkoutProgress({
  plan,
  exerciseIndex,
  elapsed,
  completedSets,
  totalSets,
  phase,
}: WorkoutProgressProps) {
  const overall = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-white/70">
          Exercise {Math.min(exerciseIndex + 1, plan.exercises.length)} of {plan.exercises.length}
        </span>
        <span className="flex items-center gap-1 font-mono text-white/50">
          <Clock className="h-3 w-3" />
          {formatClock(elapsed)}
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400"
          animate={{ width: `${overall}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      <div className="flex items-center gap-1.5">
        {plan.exercises.map((ex, i) => {
          const done = i < exerciseIndex || (i === exerciseIndex && phase === 'complete')
          const active = i === exerciseIndex
          return (
            <div
              key={ex.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                done ? 'bg-orange-500' : active ? 'bg-orange-500/40' : 'bg-white/10'
              }`}
            >
              {done && (
                <div className="flex h-full items-center justify-center">
                  <Check className="h-2 w-2 text-surface-0" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-right text-[10px] uppercase tracking-wider text-white/30">
        {completedSets} / {totalSets} sets · {overall}%
      </p>
    </div>
  )
}
