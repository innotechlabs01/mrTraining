'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { AthleteBrief, CoachSession, Exercise } from '../../types'

interface AthleteSessionCardProps {
  athlete: AthleteBrief
  session: CoachSession
  currentExerciseIndex?: number
  hr?: number
  status: 'active' | 'resting' | 'complete'
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const statusConfig: Record<string, { label: string; dotClass: string }> = {
  active: { label: 'Active', dotClass: 'bg-success shadow-[0_0_8px_theme(colors.success)]' },
  resting: { label: 'Resting', dotClass: 'bg-warning' },
  complete: { label: 'Complete', dotClass: 'bg-muted' },
}

export default function AthleteSessionCard({
  athlete,
  session,
  currentExerciseIndex = 0,
  hr,
  status,
}: AthleteSessionCardProps) {
  const currentExercise: Exercise | undefined = session.exercises[currentExerciseIndex]
  const cfg = statusConfig[status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-lg p-4"
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-surface-5 flex items-center justify-center text-sm font-semibold text-secondary">
            {getInitials(athlete.name)}
          </div>
          <div className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-1', cfg.dotClass)} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{athlete.name}</p>
          {currentExercise && status !== 'complete' ? (
            <p className="text-xs text-secondary truncate">
              {currentExercise.name} · Set {currentExerciseIndex + 1}/{currentExercise.sets}
            </p>
          ) : status === 'complete' ? (
            <p className="text-xs text-[#6B7280]">All exercises complete</p>
          ) : (
            <p className="text-xs text-[#6B7280]">Waiting for next exercise</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={cn(
            'text-xs uppercase tracking-wider',
            status === 'active' ? 'text-success' : status === 'resting' ? 'text-warning' : 'text-[#6B7280]',
          )}>
            {cfg.label}
          </span>
          {hr !== undefined && (
            <span className="text-xs text-[#6B7280] tabular-nums">{hr} bpm</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
