'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MealSlot {
  type: string
  time?: string
  calories: number
  foodCount: number
}

interface DaySchedule {
  day: string
  meals: MealSlot[]
  totalCalories: number
}

interface MealScheduleViewProps {
  days: DaySchedule[]
  selectedDay?: string
  onDayChange?: (day: string) => void
  className?: string
}

const dayLabels: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

const mealColors: Record<string, string> = {
  breakfast: 'bg-brand-primary/20 border-brand-primary/30',
  lunch: 'bg-blue-500/20 border-blue-500/30',
  dinner: 'bg-rose-500/20 border-rose-500/30',
  snack: 'bg-amber-500/20 border-amber-500/30',
  'post-workout': 'bg-emerald-500/20 border-emerald-500/30',
}

export function MealScheduleView({
  days,
  selectedDay,
  onDayChange,
  className,
}: MealScheduleViewProps) {
  const [currentIndex, setCurrentIndex] = useState(
    selectedDay ? days.findIndex((d) => d.day === selectedDay) : 0
  )
  const safeIndex = Math.max(0, Math.min(currentIndex, days.length - 1))
  const currentDay = days[safeIndex]

  const handlePrev = () => {
    const next = Math.max(0, safeIndex - 1)
    setCurrentIndex(next)
    onDayChange?.(days[next].day)
  }

  const handleNext = () => {
    const next = Math.min(days.length - 1, safeIndex + 1)
    setCurrentIndex(next)
    onDayChange?.(days[next].day)
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={safeIndex === 0}
          className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-white/60" />
        </button>

        <div className="flex items-center gap-1.5">
          {days.map((d, i) => (
            <button
              key={d.day}
              onClick={() => {
                setCurrentIndex(i)
                onDayChange?.(d.day)
              }}
              className={cn(
                'px-2 py-1 rounded-lg text-xs font-medium transition-all',
                i === safeIndex
                  ? 'bg-brand-primary text-white'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              )}
            >
              {dayLabels[d.day] || d.day.slice(0, 3)}
            </button>
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={safeIndex >= days.length - 1}
          className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-white/60" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {currentDay && (
          <motion.div
            key={currentDay.day}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-white capitalize">{currentDay.day}</h3>
              <span className="text-sm text-white/40">
                {currentDay.totalCalories} kcal
              </span>
            </div>
            <div className="space-y-2">
              {currentDay.meals.map((meal) => (
                <div
                  key={meal.type}
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-lg border',
                    mealColors[meal.type] || 'bg-white/5 border-white/10'
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-white capitalize">
                      {meal.type.replace('-', ' ')}
                    </p>
                    <p className="text-xs text-white/40">
                      {meal.foodCount} items {meal.time ? `· ${meal.time}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-white/70">
                    {meal.calories}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
