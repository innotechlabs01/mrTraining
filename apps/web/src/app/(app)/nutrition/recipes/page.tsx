'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { RecipeCard } from '@/features/nutrition/components/recipe/RecipeCard'
import { EmptyState } from '@/features/nutrition/components/shared/EmptyState'
import { useRecipes } from '@/features/nutrition/data/hooks'

const ALL_TAGS = ['breakfast', 'lunch', 'dinner', 'snack', 'high-protein', 'low-carb', 'vegan', 'quick']

export default function RecipesPage() {
  const { items: recipes, loading } = useRecipes()
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!activeTag) return recipes
    return recipes.filter((r) => r.tags?.includes(activeTag))
  }, [recipes, activeTag])

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" /></div>

  return (
    <motion.div className="max-w-3xl mx-auto p-4 space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Recipes</h1>
          <p className="text-sm text-white/40">{filtered.length} recipes</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          New Recipe
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTag(null)}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            activeTag === null ? 'bg-brand-primary text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          All
        </button>
        {ALL_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className={`shrink-0 capitalize px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeTag === tag ? 'bg-brand-primary text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<span className="text-lg">🍳</span>} title="No recipes found" description="Try a different filter" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((r) => (
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
      )}
    </motion.div>
  )
}
