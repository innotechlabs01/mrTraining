'use client'

import { motion } from 'framer-motion'
import { Moon, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SleepData, RecoveryTrend } from '../types'

const qualityLabels: Record<string, { label: string; color: string }> = {
  great: { label: 'Great', color: 'text-success' },
  good: { label: 'Good', color: 'text-warning' },
  okay: { label: 'Okay', color: 'text-orange-400' },
  poor: { label: 'Poor', color: 'text-error' },
}

function TrendIcon({ trend }: { trend: RecoveryTrend }) {
  if (trend === 'up') return <TrendingUp className="w-3 h-3 text-success" />
  if (trend === 'down') return <TrendingDown className="w-3 h-3 text-error" />
  return <Minus className="w-3 h-3 text-white/30" />
}

function SleepBar({ label, hours, color }: { label: string; hours: number; color: string }) {
  const pct = (hours / 8) * 100
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/40 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-[10px] text-white/50 w-8 text-right tabular-nums">{hours}h</span>
    </div>
  )
}

export default function SleepCard({ data, onLog }: { data: SleepData; onLog?: () => void }) {
  const quality = qualityLabels[data.quality]

  return (
    <div className="bg-surface-1 rounded-2xl p-5 border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-indigo-400" />
          <span className="text-xs text-white/50 font-medium">Sleep</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendIcon trend={data.consistency >= 80 ? 'up' : data.consistency >= 60 ? 'stable' : 'down'} />
          <span className="text-[10px] text-white/40">{data.consistency}% consistency</span>
        </div>
      </div>

      <div className="flex items-end gap-3 mb-4">
        <div className="flex items-baseline gap-1">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold font-display text-white"
          >
            {data.hours}
          </motion.span>
          <span className="text-sm text-white/40">hours</span>
        </div>
        <span className={cn('text-xs font-medium mb-1', quality.color)}>{quality.label}</span>
      </div>

      <div className="space-y-1.5 mb-3">
        <SleepBar label="Deep" hours={data.deepSleep} color="bg-indigo-500" />
        <SleepBar label="REM" hours={data.remSleep} color="bg-violet-400" />
        <SleepBar label="Light" hours={data.lightSleep} color="bg-indigo-300/50" />
        <SleepBar label="Awake" hours={data.awake} color="bg-white/10" />
      </div>

      <div className="flex items-center gap-3 text-[10px] text-white/40 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {data.bedtime} — {data.wakeTime}
        </div>
      </div>

      {onLog && (
        <button
          onClick={onLog}
          className="mt-3 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/50 hover:text-white/70 transition-colors"
        >
          Log Sleep
        </button>
      )}
    </div>
  )
}
