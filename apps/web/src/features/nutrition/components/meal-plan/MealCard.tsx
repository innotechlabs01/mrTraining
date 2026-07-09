'use client'

import { motion } from 'framer-motion'
import { Clock, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FoodItem {
  name: string
  amount: number
  unit: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface MealCardProps {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'post-workout'
  time?: string
  foods: FoodItem[]
  notes?: string
  onEdit?: () => void
  className?: string
}

const mealIcons: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍪',
  'post-workout': '💪',
}

export function MealCard({
  type,
  time,
  foods,
  notes,
  onEdit,
  className,
}: MealCardProps) {
  const totalCals = foods.reduce((s, f) => s + f.calories, 0)
  const totalProtein = foods.reduce((s, f) => s + f.protein, 0)

  return (
    <motion.div
      className={cn(
        'rounded-xl border border-white/5 bg-surface-1 p-4',
        'hover:border-white/10 transition-all duration-200',
        className
      )}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.005 }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{mealIcons[type] || '🍽️'}</span>
          <div>
            <h4 className="text-sm font-semibold text-white capitalize">{type.replace('-', ' ')}</h4>
            {time && (
              <span className="flex items-center gap-1 text-xs text-white/40">
                <Clock className="w-3 h-3" />
                {time}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onEdit}
          className="text-xs text-brand-primary hover:text-brand-primary/80 transition-colors"
        >
          Edit
        </button>
      </div>

      <div className="space-y-1 mb-2">
        {foods.map((food, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-white/70">
              {food.amount}{food.unit} {food.name}
            </span>
            <span className="text-white/50">{food.calories} kcal</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs text-white/40 border-t border-white/5 pt-2">
        <span>{totalCals} kcal</span>
        <span>{totalProtein}g protein</span>
      </div>

      {notes && (
        <div className="flex items-start gap-1.5 mt-2 text-xs text-white/40 border-t border-white/5 pt-2">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{notes}</span>
        </div>
      )}
    </motion.div>
  )
}
