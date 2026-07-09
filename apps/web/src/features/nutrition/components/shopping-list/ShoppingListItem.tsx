'use client'

import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ItemCategory = 'produce' | 'protein' | 'dairy' | 'grains' | 'pantry' | 'frozen' | 'beverages' | 'snacks' | 'other'
type ItemPriority = 'essential' | 'optional' | 'extra'

interface ShoppingListItemProps {
  id: string
  name: string
  quantity: number
  unit: string
  category: ItemCategory
  priority: ItemPriority
  isPurchased: boolean
  notes?: string
  onToggle?: (id: string) => void
  onDelete?: (id: string) => void
  className?: string
}

const categoryStyles: Record<string, { dot: string; label: string }> = {
  produce: { dot: 'bg-emerald-500', label: 'Produce' },
  protein: { dot: 'bg-red-500', label: 'Protein' },
  dairy: { dot: 'bg-blue-400', label: 'Dairy' },
  grains: { dot: 'bg-amber-500', label: 'Grains' },
  pantry: { dot: 'bg-stone-500', label: 'Pantry' },
  frozen: { dot: 'bg-cyan-500', label: 'Frozen' },
  beverages: { dot: 'bg-violet-500', label: 'Beverages' },
  snacks: { dot: 'bg-pink-500', label: 'Snacks' },
  other: { dot: 'bg-gray-500', label: 'Other' },
}

export function ShoppingListItem({
  id,
  name,
  quantity,
  unit,
  category,
  priority,
  isPurchased,
  notes,
  onToggle,
  onDelete,
  className,
}: ShoppingListItemProps) {
  const catStyle = categoryStyles[category] || categoryStyles.other

  return (
    <motion.div
      layout
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
        isPurchased ? 'bg-white/[0.02]' : 'bg-surface-1 hover:bg-white/[0.04]',
        'border border-white/5',
        className
      )}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
    >
      <input
        type="checkbox"
        checked={isPurchased}
        onChange={() => onToggle?.(id)}
        className="w-4 h-4 rounded border-white/20 bg-white/5 accent-brand-primary"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full shrink-0', catStyle.dot)} />
          <span
            className={cn(
              'text-sm transition-all',
              isPurchased ? 'text-white/30 line-through' : 'text-white/70'
            )}
          >
            {name}
          </span>
          <span className="text-xs text-white/30">{quantity} {unit}</span>
          {priority === 'essential' && (
            <span className="text-[10px] font-medium text-brand-primary bg-brand-primary/10 px-1 py-0.5 rounded">
              Essential
            </span>
          )}
        </div>
        {notes && !isPurchased && (
          <p className="text-xs text-white/30 mt-0.5 ml-4">{notes}</p>
        )}
      </div>

      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(id) }}
          className="p-1 rounded hover:bg-white/5 text-white/20 hover:text-error transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  )
}
