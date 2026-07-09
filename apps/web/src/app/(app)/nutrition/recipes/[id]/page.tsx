'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Clock, ChefHat, Users } from 'lucide-react'
import { IngredientList } from '@/features/nutrition/components/recipe/IngredientList'
import { NutritionLabel } from '@/features/nutrition/components/shared/NutritionLabel'
import { useRecipe } from '@/features/nutrition/data/hooks'

export default function RecipeDetailPage({ params }: { params: { id: string } }) {
  const { item: recipe, loading } = useRecipe(params.id)

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" /></div>
  if (!recipe) return <div className="flex items-center justify-center min-h-[60vh] text-white/40">Recipe not found</div>

  const ingredients = recipe.ingredients.map((i) => ({
    id: i.id, name: i.name, quantity: i.quantity, unit: i.unit, category: i.category,
  }))

  return (
    <motion.div className="max-w-3xl mx-auto p-4 space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center gap-3">
        <a href="/nutrition/recipes" className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </a>
        <div>
          <h1 className="text-lg font-semibold text-white">{recipe.name}</h1>
          <div className="flex items-center gap-4 text-xs text-white/40 mt-0.5">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{(recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)} min</span>
            <span className="flex items-center gap-1"><ChefHat className="w-3 h-3" />{recipe.difficulty}</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{recipe.servings} servings</span>
          </div>
        </div>
      </div>

      <NutritionLabel
        calories={recipe.calories ?? 0}
        protein={recipe.protein ?? 0}
        carbs={recipe.carbs ?? 0}
        fat={recipe.fat ?? 0}
        fiber={recipe.fiber}
        sugar={recipe.sugar}
        sodium={recipe.sodium}
      />

      <div>
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Ingredients</h2>
        <IngredientList ingredients={ingredients} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Instructions</h2>
        <ol className="space-y-3">
          {recipe.instructions.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-brand-primary/20 text-brand-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-white/80 leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      </div>
    </motion.div>
  )
}
