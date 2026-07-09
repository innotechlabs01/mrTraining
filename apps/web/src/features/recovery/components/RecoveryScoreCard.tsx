'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RecoveryScore, RecoveryTrend } from '../types'

function TrendIcon({ trend }: { trend: RecoveryTrend }) {
  if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-success" />
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-error" />
  return <Minus className="w-3.5 h-3.5 text-white/40" />
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-success'
  if (score >= 60) return 'text-warning'
  return 'text-error'
}

function getScoreRingColor(score: number): string {
  if (score >= 80) return 'stroke-success'
  if (score >= 60) return 'stroke-warning'
  return 'stroke-error'
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className={getScoreRingColor(score)}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        strokeDasharray={circumference}
      />
    </svg>
  )
}

export default function RecoveryScoreCard({ score }: { score: RecoveryScore }) {
  const subScores: { label: string; value: number }[] = [
    { label: 'Sleep', value: score.sleep },
    { label: 'HRV', value: score.hrv },
    { label: 'Stress', value: score.stress },
    { label: 'Hydration', value: score.hydration },
    { label: 'Feeling', value: score.subjective },
  ]

  return (
    <div className="bg-surface-1 rounded-2xl p-5 border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-white/50 font-medium">Recovery Score</span>
        <div className="flex items-center gap-1.5 text-xs">
          <TrendIcon trend={score.trend} />
          <span className="text-white/40">
            {score.trend === 'up' ? '+2 pts' : score.trend === 'down' ? '-2 pts' : 'Stable'}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center py-2">
        <div className="relative">
          <ScoreRing score={score.overall} />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
              className={cn('text-3xl font-bold font-display', getScoreColor(score.overall))}
            >
              {score.overall}
            </motion.span>
          </div>
        </div>
        <p className="text-xs text-white/40 mt-2">
          {score.overall >= 80 ? 'Ready for intensity'
            : score.overall >= 60 ? 'Moderate — proceed with caution'
            : 'Prioritize recovery today'}
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {subScores.map((sub) => (
          <div key={sub.label} className="flex items-center gap-3">
            <span className="text-xs text-white/40 w-16 shrink-0">{sub.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${sub.value}%` }}
                transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                className={cn(
                  'h-full rounded-full',
                  sub.value >= 80 ? 'bg-success'
                    : sub.value >= 60 ? 'bg-warning'
                    : 'bg-error'
                )}
              />
            </div>
            <span className={cn(
              'text-xs font-medium w-8 text-right tabular-nums',
              sub.value >= 80 ? 'text-success'
                : sub.value >= 60 ? 'text-warning'
                : 'text-error'
            )}>
              {sub.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
