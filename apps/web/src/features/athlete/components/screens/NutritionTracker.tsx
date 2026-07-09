'use client'

import { motion } from 'framer-motion'
import { Apple, Droplets, Pill, CheckCircle } from 'lucide-react'
import { useNutrition } from '@/features/athlete/hooks/useExtra'
import { cn } from '@/lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

function NutritionSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 bg-white/5 rounded-xl w-1/3" />
      <div className="h-28 bg-white/5 rounded-2xl" />
      <div className="h-40 bg-white/5 rounded-2xl" />
      <div className="h-24 bg-white/5 rounded-2xl" />
    </div>
  )
}

function WaterGlobe({ current, goal }: { current: number; goal: number }) {
  const pct = Math.min(Math.round((current / goal) * 100), 100)
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-12 h-16 rounded-full bg-blue-500/5 border border-blue-500/20 overflow-hidden flex-shrink-0">
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-blue-500/30"
          initial={{ height: '0%' }}
          animate={{ height: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-blue-400/20"
          initial={{ height: '0%' }}
          animate={{ height: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{current}ml</p>
        <p className="text-xs text-white/40">of {goal}ml goal</p>
        <div className="mt-2 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          />
        </div>
      </div>
    </div>
  )
}

export default function NutritionTracker() {
  const { meals, water, supplements, loading, error, logMeal, addWater, takeSupplement } = useNutrition()

  if (loading) return <NutritionSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Apple className="w-10 h-10 text-red-400/50 mb-4" />
        <p className="text-red-400 text-sm mb-2">{error}</p>
        <p className="text-white/40 text-xs">Please try again</p>
      </div>
    )
  }

  const loggedCount = meals.filter(m => m.logged).length
  const allMealsLogged = loggedCount === meals.length && meals.length > 0

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-xl font-bold text-white">Nutrition</h1>
        <p className="text-sm text-white/40 mt-1">Fuel your performance</p>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-surface-1 rounded-2xl p-5 border border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <Droplets className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-white/50 font-medium">Hydration</span>
        </div>
        <WaterGlobe current={water.current} goal={water.goal} />
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => addWater(250)}
          className="mt-4 w-full py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/15 transition-colors"
        >
          + 250ml
        </motion.button>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-surface-1 rounded-2xl p-5 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Apple className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-white/50 font-medium">Meals</span>
          </div>
          <span className={cn(
            'text-xs font-medium',
            allMealsLogged ? 'text-green-400' : 'text-white/40'
          )}>
            {loggedCount}/{meals.length}
          </span>
        </div>

        <div className="space-y-2">
          {meals.map((meal) => (
            <div
              key={meal.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                meal.logged
                  ? 'bg-green-500/5 border-green-500/15'
                  : 'bg-white/[0.03] border-white/5'
              )}
            >
              <CheckCircle
                className={cn(
                  'w-4 h-4 flex-shrink-0',
                  meal.logged ? 'text-green-400' : 'text-white/10'
                )}
              />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm',
                  meal.logged ? 'text-white/40 line-through' : 'text-white'
                )}>
                  {meal.name}
                </p>
                <p className="text-xs text-white/30 mt-0.5">
                  {meal.type} &middot; {meal.calories} cal &middot; {meal.protein}g protein
                </p>
                {meal.suggestion && !meal.logged && (
                  <p className="text-[10px] text-white/20 mt-1 italic">{meal.suggestion}</p>
                )}
              </div>
              {!meal.logged && (
                <button
                  onClick={() => logMeal(meal.id)}
                  className="text-xs text-orange-400 font-medium flex-shrink-0 hover:text-orange-300 transition-colors"
                >
                  Log
                </button>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-surface-1 rounded-2xl p-5 border border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <Pill className="w-4 h-4 text-purple-400" />
          <span className="text-xs text-white/50 font-medium">Supplements</span>
        </div>
        <div className="space-y-2">
          {supplements.map((s) => (
            <div
              key={s.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-xl border transition-colors',
                s.taken ? 'bg-green-500/5 border-green-500/15' : 'bg-white/[0.03] border-white/5'
              )}
            >
              <div>
                <p className={cn('text-sm', s.taken ? 'text-white/40 line-through' : 'text-white')}>
                  {s.name}
                </p>
                <p className="text-xs text-white/30">{s.dosage} &middot; {s.time}</p>
              </div>
              {!s.taken && (
                <button
                  onClick={() => takeSupplement(s.id)}
                  className="text-xs text-purple-400 font-medium hover:text-purple-300 transition-colors"
                >
                  Take
                </button>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {allMealsLogged && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center pt-2"
        >
          <a
            href="/athlete/today/community"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-400 active:scale-[0.97] transition-all"
          >
            Next: Community
            <span className="text-lg">→</span>
          </a>
        </motion.div>
      )}
    </motion.div>
  )
}
