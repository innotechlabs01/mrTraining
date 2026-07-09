'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Apple, BookOpen, ShoppingCart } from 'lucide-react'
import { CalorieProgress } from '@/features/nutrition/components/shared/CalorieProgress'
import { MacroDisplay } from '@/features/nutrition/components/shared/MacroDisplay'
import { MealPlanCard } from '@/features/nutrition/components/meal-plan/MealPlanCard'
import { RecipeCard } from '@/features/nutrition/components/recipe/RecipeCard'
import { ShoppingListCard } from '@/features/nutrition/components/shopping-list/ShoppingListCard'
import { EmptyState } from '@/features/nutrition/components/shared/EmptyState'
import { useMealPlans, useRecipes, useShoppingLists } from '@/features/nutrition/data/hooks'

export default function NutritionDashboard() {
  const { items: mealPlans, loading: mpLoading } = useMealPlans()
  const { items: recipes, loading: rLoading } = useRecipes()
  const { items: shoppingLists, loading: slLoading } = useShoppingLists()
  const loading = mpLoading || rLoading || slLoading

  const activePlan = useMemo(() => mealPlans.find((p) => p.status === 'active'), [mealPlans])
  const recentRecipes = useMemo(() => recipes.slice(0, 6), [recipes])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const todayCalories = useMemo(() => {
    if (!activePlan) return { current: 1850, target: 2500 }
    const g = activePlan.nutritionGoals
    return { current: Math.round(g.targetCalories * 0.65), target: g.targetCalories }
  }, [activePlan])

  const todayMacros = useMemo(() => {
    if (!activePlan) {
      return {
        protein: { current: 120, target: 150 },
        carbs: { current: 200, target: 300 },
        fat: { current: 55, target: 80 },
      }
    }
    const g = activePlan.nutritionGoals
    return {
      protein: { current: Math.round(g.targetProtein * 0.6), target: g.targetProtein },
      carbs: { current: Math.round(g.targetCarbs * 0.6), target: g.targetCarbs },
      fat: { current: Math.round(g.targetFat * 0.6), target: g.targetFat },
    }
  }, [activePlan])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      className="max-w-4xl mx-auto p-4 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Nutrition</h1>
          <p className="text-sm text-white/40">Track your meals and macros</p>
        </div>
        <div className="flex gap-2">
          <NavButton href="/nutrition/meal-plans" icon={<Apple />} label="Meal Plans" />
          <NavButton href="/nutrition/recipes" icon={<BookOpen />} label="Recipes" />
          <NavButton href="/nutrition/shopping-lists" icon={<ShoppingCart />} label="Shopping" />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/5 bg-surface-1 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Daily Progress</h2>
          <CalorieProgress current={todayCalories.current} target={todayCalories.target} />
          <MacroDisplay
            protein={todayMacros.protein}
            carbs={todayMacros.carbs}
            fat={todayMacros.fat}
          />
        </div>

        <div className="rounded-xl border border-white/5 bg-surface-1 p-4">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Active Meal Plan</h2>
          {activePlan ? (
            <MealPlanCard
              key={activePlan.id}
              id={activePlan.id}
              name={activePlan.name}
              startDate={activePlan.startDate}
              endDate={activePlan.endDate}
              mealCount={activePlan.meals.length}
              calories={activePlan.nutritionGoals.targetCalories}
              protein={activePlan.nutritionGoals.targetProtein}
              carbs={activePlan.nutritionGoals.targetCarbs}
              fat={activePlan.nutritionGoals.targetFat}
              status={activePlan.status}
              onClick={(id) => window.location.href = `/nutrition/meal-plans/${id}`}
            />
          ) : (
            <EmptyState icon={<Apple className="w-6 h-6" />} title="No active plan" description="Create a meal plan to get started" />
          )}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Recent Recipes</h2>
          <a href="/nutrition/recipes" className="text-xs text-brand-primary hover:underline">View all</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {recentRecipes.map((r) => (
            <RecipeCard
              key={r.id}
              id={r.id}
              name={r.name}
              difficulty={r.difficulty}
              servings={r.servings}
              prepTime={r.prepTime}
              cookTime={r.cookTime}
              calories={r.calories ?? 0}
              protein={r.protein ?? 0}
              tags={r.tags}
              onClick={(id) => window.location.href = `/nutrition/recipes/${id}`}
            />
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Shopping Lists</h2>
          <a href="/nutrition/shopping-lists" className="text-xs text-brand-primary hover:underline">View all</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shoppingLists.map((sl) => (
            <ShoppingListCard
              key={sl.id}
              id={sl.id}
              name={sl.name}
              description={sl.description}
              itemCount={sl.items.length}
              purchasedCount={sl.purchasedCount}
              createdAt={sl.createdAt}
              onClick={(id) => window.location.href = `/nutrition/shopping-lists/${id}`}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

function NavButton({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10 hover:text-white transition-all"
    >
      {icon}
      {label}
    </a>
  )
}
