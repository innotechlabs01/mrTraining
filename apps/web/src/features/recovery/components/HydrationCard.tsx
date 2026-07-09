'use client'

import { motion } from 'framer-motion'
import { Droplets, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HydrationData } from '../types'

export default function HydrationCard({
  data,
  onAdd,
}: {
  data: HydrationData
  onAdd?: (amount: number) => void
}) {
  const pct = Math.min((data.current / data.goal) * 100, 100)

  const remaining = data.goal - data.current
  const glassesTotal = Math.ceil(data.goal / 250)
  const glassesDone = Math.floor(data.current / 250)

  return (
    <div className="bg-surface-1 rounded-2xl p-5 border border-white/5">
      <div className="flex items-center gap-2 mb-4">
        <Droplets className="w-4 h-4 text-blue-400" />
        <span className="text-xs text-white/50 font-medium">Hydration</span>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold font-display text-white"
        >
          {Math.round(data.current / 100) * 100}
        </motion.span>
        <span className="text-sm text-white/40">ml</span>
        <span className="text-xs text-white/30 ml-auto">
          {Math.round(pct)}% of {Math.round(data.goal / 1000)}L
        </span>
      </div>

      <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full transition-colors',
            pct >= 80 ? 'bg-success'
              : pct >= 50 ? 'bg-blue-400'
              : pct >= 25 ? 'bg-warning'
              : 'bg-error'
          )}
        />
      </div>

      <div className="flex gap-1 mb-3">
        {Array.from({ length: glassesTotal }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 h-1.5 rounded-full',
              i < glassesDone ? 'bg-blue-400/60' : 'bg-white/5'
            )}
          />
        ))}
      </div>

      <p className="text-xs text-white/40">
        {remaining > 0 ? `${Math.round(remaining / 100) * 100} ml remaining` : 'Goal reached!'}
      </p>

      {onAdd && (
        <div className="flex gap-2 mt-3">
          {[250, 500, 750].map((amount) => (
            <button
              key={amount}
              onClick={() => onAdd(amount)}
              disabled={data.current >= data.goal}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-white/50 hover:text-white/70 transition-all"
            >
              <Plus className="w-3 h-3" />
              {amount}ml
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
