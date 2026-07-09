'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Dumbbell,
  CheckCircle,
  AlertCircle,
  Clock,
  Target,
  Weight,
} from 'lucide-react'
import { useWorkoutRecords } from '@/features/athlete/hooks/useWorkoutRecords'
import { formatDuration, formatDate, GOAL_LABELS, MUSCLE_GROUP_LABELS } from '@/features/workout'
import { cn } from '@/lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

function HistorySkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 bg-white/5 rounded-xl w-1/3" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 bg-white/5 rounded-2xl" />
      ))}
    </div>
  )
}

function SetRow({ set, index }: { set: { setNumber: number; reps: number; weight?: number; rpe?: number; completed: boolean }; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 py-1.5"
    >
      <div className={cn(
        'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
        set.completed ? 'bg-green-500/15' : 'bg-white/5'
      )}>
        {set.completed ? (
          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
        )}
      </div>
      <span className="text-xs text-white/40 w-12 flex-shrink-0">
        Set {set.setNumber}
      </span>
      <span className="text-sm text-white font-medium">
        {set.reps} reps
        {set.weight ? ` @ ${set.weight}kg` : ''}
      </span>
      {set.rpe && (
        <span className="text-xs text-white/30 ml-auto">
          RPE: {set.rpe}
        </span>
      )}
    </motion.div>
  )
}

export default function WorkoutHistory() {
  const { records, loading, error } = useWorkoutRecords()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (loading) return <HistorySkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-400/50 mb-4" />
        <p className="text-red-400 text-sm mb-2">{error}</p>
        <p className="text-white/40 text-xs">We&apos;ll try again in a moment</p>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <Dumbbell className="w-10 h-10 text-white/20 mb-4" />
        <p className="text-white font-semibold text-lg mb-1">Complete your first workout</p>
        <p className="text-white/40 text-sm leading-relaxed">
          to see history here
        </p>
        <p className="text-white/30 text-xs mt-2">
          Your completed workouts will appear here with set-by-set breakdowns
        </p>
      </motion.div>
    )
  }

  const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      <motion.h1
        variants={cardVariants}
        className="text-xl font-bold text-white"
      >
        Workout History
      </motion.h1>

      {sorted.map((record) => {
        const isExpanded = expandedId === record.id
        const allCompleted = record.exercises.every((ex) =>
          ex.sets.every((s) => s.completed)
        )

        return (
          <motion.div
            key={record.id}
            variants={cardVariants}
            layout
            className="bg-surface-1 rounded-2xl border border-white/5 overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : record.id)}
              className="w-full text-left p-5"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-white/40">{formatDate(record.date)}</span>
                <div className="flex items-center gap-2">
                  {allCompleted && (
                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                  )}
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-white/30" />
                  </motion.div>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-1">{record.workoutName}</h3>

              <div className="flex items-center gap-3">
                <span className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full',
                  record.goal === 'strength' && 'bg-red-500/10 text-red-400',
                  record.goal === 'hypertrophy' && 'bg-purple-500/10 text-purple-400',
                  record.goal === 'endurance' && 'bg-blue-500/10 text-blue-400',
                  record.goal === 'conditioning' && 'bg-green-500/10 text-green-400',
                  record.goal === 'speed' && 'bg-yellow-500/10 text-yellow-400',
                  record.goal === 'power' && 'bg-orange-500/10 text-orange-400',
                  !['strength', 'hypertrophy', 'endurance', 'conditioning', 'speed', 'power'].includes(record.goal) && 'bg-white/5 text-white/50',
                )}>
                  {GOAL_LABELS[record.goal] ?? record.goal}
                </span>
                <span className="flex items-center gap-1 text-xs text-white/30">
                  <Clock className="w-3 h-3" />
                  {record.duration ? formatDuration(record.duration) : '—'}
                </span>
                {record.totalVolume ? (
                  <span className="flex items-center gap-1 text-xs text-white/30">
                    <Weight className="w-3 h-3" />
                    {(record.totalVolume / 1000).toFixed(1)}k kg
                  </span>
                ) : null}
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
                    {record.exercises.map((ex) => {
                      const exAllDone = ex.sets.every((s) => s.completed)
                      return (
                        <div key={ex.exerciseId}>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm font-semibold text-white">{ex.exerciseName}</p>
                            {exAllDone && (
                              <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            {ex.sets.map((set, si) => (
                              <SetRow key={si} set={set} index={si} />
                            ))}
                          </div>
                          {ex.notes && (
                            <p className="text-xs text-white/30 mt-1 italic">{ex.notes}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
