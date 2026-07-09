'use client'

import { motion } from 'framer-motion'
import { Clock, ChefHat, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RecipeCardProps {
  id: string
  name: string
  difficulty: 'easy' | 'medium' | 'hard'
  servings: number
  prepTime?: number
  cookTime?: number
  calories: number
  protein: number
  tags?: string[]
  imageUrl?: string
  onClick?: (id: string) => void
  className?: string
}

const difficultyColors: Record<string, string> = {
  easy: 'text-emerald-400 bg-emerald-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  hard: 'text-rose-400 bg-rose-500/10',
}

export function RecipeCard({
  id,
  name,
  difficulty,
  servings,
  prepTime,
  cookTime,
  calories,
  protein,
  tags,
  imageUrl,
  onClick,
  className,
}: RecipeCardProps) {
  const totalTime = (prepTime || 0) + (cookTime || 0)

  return (
    <motion.button
      onClick={() => onClick?.(id)}
      className={cn(
        'w-full rounded-xl border border-white/5 bg-surface-1 overflow-hidden text-left',
        'hover:border-white/10 hover:shadow-md transition-all duration-200',
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {imageUrl && (
        <div className="h-32 bg-surface-2 overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-3.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-white line-clamp-1">{name}</h3>
          <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded shrink-0 capitalize', difficultyColors[difficulty])}>
            {difficulty}
          </span>
        </div>

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => (
              <span key={t} className="text-xs text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-white/40">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {servings}
          </span>
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {totalTime}m
            </span>
          )}
          <span className="flex items-center gap-1">
            <ChefHat className="w-3 h-3" />
            {calories} kcal
          </span>
        </div>

        <div className="pt-1.5 border-t border-white/5">
          <span className="text-xs text-blue-400">{protein}g protein</span>
        </div>
      </div>
    </motion.button>
  )
}
