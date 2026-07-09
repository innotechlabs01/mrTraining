'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MacroDisplayProps {
  protein: { current: number; target: number; unit?: string }
  carbs: { current: number; target: number; unit?: string }
  fat: { current: number; target: number; unit?: string }
  fiber?: { current: number; target: number; unit?: string }
  className?: string
}

const macroColors = {
  protein: { bar: 'bg-blue-500', text: 'text-blue-400', label: 'Protein' },
  carbs: { bar: 'bg-amber-500', text: 'text-amber-400', label: 'Carbs' },
  fat: { bar: 'bg-rose-500', text: 'text-rose-400', label: 'Fat' },
  fiber: { bar: 'bg-emerald-500', text: 'text-emerald-400', label: 'Fiber' },
}

function MacroRow({
  current,
  target,
  unit,
  colors,
}: {
  current: number
  target: number
  unit?: string
  colors: { bar: string; text: string; label: string }
}) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={cn('text-sm font-medium', colors.text)}>
          {colors.label}
        </span>
        <span className="text-sm text-white/60">
          {current}{unit || 'g'} / {target}{unit || 'g'}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', colors.bar)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export function MacroDisplay({
  protein,
  carbs,
  fat,
  fiber,
  className,
}: MacroDisplayProps) {
  const unit = protein.unit || 'g'

  return (
    <div className={cn('space-y-3', className)}>
      <MacroRow current={protein.current} target={protein.target} unit={unit} colors={macroColors.protein} />
      <MacroRow current={carbs.current} target={carbs.target} unit={unit} colors={macroColors.carbs} />
      <MacroRow current={fat.current} target={fat.target} unit={unit} colors={macroColors.fat} />
      {fiber && <MacroRow current={fiber.current} target={fiber.target} unit={unit} colors={macroColors.fiber} />}
    </div>
  )
}
