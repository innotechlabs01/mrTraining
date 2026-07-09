'use client'

import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { MealPlanCard } from '@/features/nutrition/components/meal-plan/MealPlanCard'
import { EmptyState } from '@/features/nutrition/components/shared/EmptyState'
import { useMealPlans } from '@/features/nutrition/data/hooks'

export default function MealPlansPage() {
  const { items: plans, loading } = useMealPlans()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div
      className="max-w-3xl mx-auto p-4 space-y-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Meal Plans</h1>
          <p className="text-sm text-white/40">{plans.length} plans</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          New Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <EmptyState icon={<span className="text-lg">📋</span>} title="No meal plans yet" description="Create your first meal plan" />
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <MealPlanCard
              key={plan.id}
              id={plan.id}
              name={plan.name}
              startDate={plan.startDate}
              endDate={plan.endDate}
              mealCount={plan.meals.length}
              calories={plan.nutritionGoals.targetCalories}
              protein={plan.nutritionGoals.targetProtein}
              carbs={plan.nutritionGoals.targetCarbs}
              fat={plan.nutritionGoals.targetFat}
              status={plan.status}
              onClick={(id) => window.location.href = `/nutrition/meal-plans/${id}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}
