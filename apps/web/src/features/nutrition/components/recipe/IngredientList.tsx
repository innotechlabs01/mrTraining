'use client'

import { cn } from '@/lib/utils'

interface Ingredient {
  id: string
  name: string
  quantity: number
  unit: string
  category: string
}

interface IngredientListProps {
  ingredients: Ingredient[]
  checkedIds?: Set<string>
  onToggle?: (id: string) => void
  className?: string
}

const categoryLabels: Record<string, string> = {
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fats & Oils',
  vegetable: 'Vegetables',
  fruit: 'Fruit',
  spice: 'Spices & Seasonings',
  dairy: 'Dairy',
  grain: 'Grains',
  other: 'Other',
}

export function IngredientList({
  ingredients,
  checkedIds,
  onToggle,
  className,
}: IngredientListProps) {
  const grouped = ingredients.reduce<Record<string, Ingredient[]>>((acc, ing) => {
    const cat = ing.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ing)
    return acc
  }, {})

  return (
    <div className={cn('space-y-3', className)}>
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
            {categoryLabels[category] || category}
          </h4>
          <div className="space-y-0.5">
            {items.map((ing) => {
              const checked = checkedIds?.has(ing.id)
              return (
                <label
                  key={ing.id}
                  className={cn(
                    'flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer',
                    'hover:bg-white/5 transition-colors'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked || false}
                    onChange={() => onToggle?.(ing.id)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 accent-brand-primary"
                  />
                  <span
                    className={cn(
                      'text-sm transition-all',
                      checked ? 'text-white/30 line-through' : 'text-white/70'
                    )}
                  >
                    {ing.quantity} {ing.unit} {ing.name}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
