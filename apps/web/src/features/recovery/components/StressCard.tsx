'use client'

import { motion } from 'framer-motion'
import { Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StressData, RecoveryTrend } from '../types'

function TrendIcon({ trend }: { trend: RecoveryTrend }) {
  if (trend === 'down') return <TrendingDown className="w-3 h-3 text-success" />
  if (trend === 'up') return <TrendingUp className="w-3 h-3 text-error" />
  return <Minus className="w-3 h-3 text-white/30" />
}

function getStressLevel(value: number): { label: string; color: string } {
  if (value <= 25) return { label: 'Low', color: 'text-success' }
  if (value <= 45) return { label: 'Moderate', color: 'text-warning' }
  if (value <= 65) return { label: 'Elevated', color: 'text-orange-400' }
  return { label: 'High', color: 'text-error' }
}

function MiniSparkline({ readings }: { readings: number[] }) {
  const max = Math.max(...readings, 1)
  const min = Math.min(...readings, 0)
  const range = max - min || 1
  const w = 80
  const h = 24
  const points = readings.map((v, i) => {
    const x = (i / (readings.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  })

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={readings[readings.length - 1] <= readings[0] ? '#00C853' : '#FF3D00'}
        strokeWidth="1.5"
        className="opacity-60"
      />
    </svg>
  )
}

export default function StressCard({ data }: { data: StressData }) {
  const level = getStressLevel(data.current)

  return (
    <div className="bg-surface-1 rounded-2xl p-5 border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-xs text-white/50 font-medium">Stress</span>
        </div>
        <MiniSparkline readings={data.readings} />
      </div>

      <div className="flex items-baseline gap-2">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold font-display text-white"
        >
          {data.current}
        </motion.span>
        <div className="flex items-center gap-1 ml-auto">
          <TrendIcon trend={data.trend} />
          <span className={cn(
            'text-xs',
            data.trend === 'down' ? 'text-success'
              : data.trend === 'up' ? 'text-error'
              : 'text-white/40'
          )}>
            {data.trend === 'down' ? `-${data.baseline - data.current}`
              : data.trend === 'up' ? `+${data.current - data.baseline}`
              : 'Stable'}
          </span>
        </div>
      </div>

      <p className={cn('text-xs mt-1 font-medium', level.color)}>{level.label}</p>
      <p className="text-xs text-white/40 mt-0.5">
        Baseline {data.baseline} &middot; 7-day avg {data.sevenDayAvg}
      </p>
    </div>
  )
}
