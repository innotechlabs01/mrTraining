'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CalorieProgressProps {
  current: number
  target: number
  label?: string
  showPercentage?: boolean
  className?: string
}

export function CalorieProgress({
  current,
  target,
  label = 'Calories',
  showPercentage = true,
  className,
}: CalorieProgressProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0
  const remaining = Math.max(target - current, 0)

  const getBarColor = () => {
    if (percentage >= 100) return 'bg-error'
    if (percentage >= 85) return 'bg-warning'
    return 'bg-brand-primary'
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/80">{label}</span>
        <span className="text-sm text-white/60">
          {current.toLocaleString()} / {target.toLocaleString()} kcal
          {showPercentage && ` (${Math.round(percentage)}%)`}
        </span>
      </div>
      <div className="h-3 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full transition-colors', getBarColor())}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
      {remaining > 0 && (
        <p className="text-xs text-white/40">
          {remaining.toLocaleString()} kcal remaining
        </p>
      )}
    </div>
  )
}
