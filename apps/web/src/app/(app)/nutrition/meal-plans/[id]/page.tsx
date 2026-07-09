'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Edit } from 'lucide-react'
import { CalorieProgress } from '@/features/nutrition/components/shared/CalorieProgress'
import { MacroDisplay } from '@/features/nutrition/components/shared/MacroDisplay'
import { MealScheduleView } from '@/features/nutrition/components/meal-plan/MealScheduleView'
import { useMealPlan } from '@/features/nutrition/data/hooks'

export default function MealPlanDetailPage({ params }: { params: { id: string } }) {
  const { item: plan, loading } = useMealPlan(params.id)

  const daySchedules = useMemo(() => {
    if (!plan) return []
    const dayMap = new Map<string, { day: string; meals: { type: string; time?: string; calories: number; foodCount: number }[]; totalCalories: number }>()
    for (const meal of plan.meals) {
      if (!dayMap.has(meal.dayOfWeek)) {
        dayMap.set(meal.dayOfWeek, { day: meal.dayOfWeek, meals: [], totalCalories: 0 })
      }
      const entry = dayMap.get(meal.dayOfWeek)!
      const mealCals = meal.foods.reduce((sum, f) => sum + f.calories, 0)
      entry.meals.push({ type: meal.mealType, time: meal.time, calories: mealCals, foodCount: meal.foods.length })
      entry.totalCalories += mealCals
    }
    return Array.from(dayMap.values())
  }, [plan])

  const todayMealCount = useMemo(() => {
    if (!plan) return 0
    return plan.meals.filter((m) => m.dayOfWeek === 'monday').length
  }, [plan])

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" /></div>
  if (!plan) return <div className="flex items-center justify-center min-h-[60vh] text-white/40">Meal plan not found</div>

  const g = plan.nutritionGoals

  return (
    <motion.div className="max-w-3xl mx-auto p-4 space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/nutrition/meal-plans" className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div>
            <h1 className="text-lg font-semibold text-white">{plan.name}</h1>
            <p className="text-xs text-white/40">{plan.startDate} – {plan.endDate}</p>
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10 hover:text-white transition-all">
          <Edit className="w-3.5 h-3.5" />
          Edit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/5 bg-surface-1 p-4 space-y-4">
          <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Daily Targets</h2>
          <CalorieProgress current={Math.round(g.targetCalories * 0.65)} target={g.targetCalories} />
          <MacroDisplay
            protein={{ current: Math.round(g.targetProtein * 0.6), target: g.targetProtein }}
            carbs={{ current: Math.round(g.targetCarbs * 0.6), target: g.targetCarbs }}
            fat={{ current: Math.round(g.targetFat * 0.6), target: g.targetFat }}
            fiber={{ current: Math.round(g.targetFiber * 0.5), target: g.targetFiber }}
          />
        </div>
        <div className="rounded-xl border border-white/5 bg-surface-1 p-4 space-y-3">
          <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Today&apos;s Meals</h2>
          <p className="text-2xl font-bold text-white">{todayMealCount}</p>
          <p className="text-xs text-white/40">meals scheduled</p>
          {plan.tags && plan.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {plan.tags.map((tag) => (
                <span key={tag} className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {daySchedules.length > 0 && <MealScheduleView days={daySchedules} />}
    </motion.div>
  )
}
