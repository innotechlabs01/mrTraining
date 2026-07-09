'use client'

import { motion } from 'framer-motion'
import { Timer, Coffee } from 'lucide-react'

interface RestTimerProps {
  remaining: number
  total: number
  cueText: string
}

const RADIUS = 58
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function RestTimer({ remaining, total, cueText }: RestTimerProps) {
  const clampedTotal = Math.max(total, 1)
  const progress = 1 - Math.min(remaining, clampedTotal) / clampedTotal
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-3xl border border-white/5 bg-surface-1 p-6"
    >
      <div className="flex items-center gap-2 text-orange-400">
        <Coffee className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">Rest</span>
      </div>

      <div className="relative mx-auto my-4 flex h-36 w-36 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <motion.circle
            cx="64" cy="64" r={RADIUS} fill="none"
            stroke="#FF6B00" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - progress) }}
            transition={{ duration: 0.5, ease: 'linear' }}
          />
        </svg>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-4xl font-bold tabular-nums text-white">
            <Timer className="h-5 w-5 text-white/40" />
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <p className="text-[10px] uppercase tracking-wider text-white/30">recover</p>
        </div>
      </div>

      <p className="text-center text-xs italic text-white/50">&ldquo;{cueText}&rdquo;</p>
    </motion.div>
  )
}
