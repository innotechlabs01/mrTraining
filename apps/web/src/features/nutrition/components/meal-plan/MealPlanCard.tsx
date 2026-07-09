'use client'

import { motion } from 'framer-motion'
import { Calendar, ChevronRight, Utensils } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MealPlanCardProps {
  id: string
  name: string
  startDate: string
  endDate: string
  mealCount: number
  calories: number
  protein: number
  carbs: number
  fat: number
  status: 'draft' | 'active' | 'completed' | 'archived'
  onClick?: (id: string) => void
  className?: string
}

const statusStyles: Record<string, string> = {
  draft: 'bg-white/5 text-white/40',
  active: 'bg-brand-primary/20 text-brand-primary',
  completed: 'bg-emerald-500/20 text-emerald-400',
  archived: 'bg-white/5 text-white/40',
}

export function MealPlanCard({
  id,
  name,
  startDate,
  endDate,
  mealCount,
  calories,
  protein,
  carbs,
  fat,
  status,
  onClick,
  className,
}: MealPlanCardProps) {
  const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const end = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <motion.button
      onClick={() => onClick?.(id)}
      className={cn(
        'w-full rounded-xl border border-white/5 bg-surface-1 p-4 text-left',
        'hover:border-white/10 hover:shadow-md transition-all duration-200',
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white">{name}</h3>
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Calendar className="w-3.5 h-3.5" />
            {start} - {end}
          </div>
        </div>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statusStyles[status])}>
          {status}
        </span>
      </div>

      <div className="flex items-center gap-3 text-sm text-white/60 mb-3">
        <span className="flex items-center gap-1">
          <Utensils className="w-3.5 h-3.5" />
          {mealCount} meals
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 py-2 border-t border-white/5">
        <MacroStat label="Cal" value={calories} color="text-white" />
        <MacroStat label="Protein" value={`${protein}g`} color="text-blue-400" />
        <MacroStat label="Carbs" value={`${carbs}g`} color="text-amber-400" />
        <MacroStat label="Fat" value={`${fat}g`} color="text-rose-400" />
      </div>

      <div className="flex items-center justify-end mt-1">
        <span className="text-xs text-brand-primary flex items-center gap-0.5">
          View details <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </motion.button>
  )
}

function MacroStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="text-center">
      <p className={cn('text-sm font-semibold', color)}>{value}</p>
      <p className="text-xs text-white/40">{label}</p>
    </div>
  )
}
