'use client'

import { motion } from 'framer-motion'
import { Trophy, Clock, Dumbbell, RotateCcw } from 'lucide-react'

interface CompletionScreenProps {
  planName: string
  elapsed: number
  completedSets: number
  totalSets: number
  totalExercises: number
  onRestart: () => void
}

function formatClock(totalSec: number) {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export function CompletionScreen({
  planName, elapsed, completedSets, totalSets, totalExercises, onRestart,
}: CompletionScreenProps) {
  const stats = [
    { icon: <Clock className="h-4 w-4" />, label: 'Time', value: formatClock(elapsed) },
    { icon: <Dumbbell className="h-4 w-4" />, label: 'Exercises', value: String(totalExercises) },
    { icon: <Trophy className="h-4 w-4" />, label: 'Sets', value: `${completedSets}/${totalSets}` },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      className="flex flex-col items-center py-10 text-center"
    >
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
        className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15"
      >
        <Trophy className="h-10 w-10 text-green-400" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-2xl font-bold text-white"
      >
        {planName} complete!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-1 text-sm text-white/50"
      >
        That’s a session that moves the needle. Recover smart.
      </motion.p>

      <div className="mt-6 grid w-full grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="rounded-2xl border border-white/5 bg-surface-1 p-3"
          >
            <div className="mb-1 flex justify-center text-orange-400">{s.icon}</div>
            <p className="text-lg font-bold text-white">{s.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/30">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85 }}
        onClick={onRestart}
        className="mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/70 transition-colors hover:text-white"
      >
        <RotateCcw className="h-4 w-4" />
        Do it again
      </motion.button>
    </motion.div>
  )
}
