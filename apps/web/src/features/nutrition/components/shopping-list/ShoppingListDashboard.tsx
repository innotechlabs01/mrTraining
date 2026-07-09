'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ShoppingListItem } from './ShoppingListItem'
import { EmptyState } from '../shared/EmptyState'

interface ItemData {
  id: string
  name: string
  quantity: number
  unit: string
  category: 'produce' | 'protein' | 'dairy' | 'grains' | 'pantry' | 'frozen' | 'beverages' | 'snacks' | 'other'
  priority: 'essential' | 'optional' | 'extra'
  isPurchased: boolean
  notes?: string
}

interface ShoppingListDashboardProps {
  name: string
  items: ItemData[]
  onToggleItem: (id: string) => void
  onDeleteItem: (id: string) => void
  onAddItem?: () => void
  className?: string
}

export function ShoppingListDashboard({
  name,
  items,
  onToggleItem,
  onDeleteItem,
  onAddItem,
  className,
}: ShoppingListDashboardProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'purchased'>('all')
  const purchasedCount = items.filter((i) => i.isPurchased).length
  const progress = items.length > 0 ? Math.round((purchasedCount / items.length) * 100) : 0

  const filteredItems = items.filter((item) => {
    if (filter === 'purchased') return item.isPurchased
    if (filter === 'active') return !item.isPurchased
    return true
  })

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{name}</h2>
          <p className="text-sm text-white/40">
            {purchasedCount} of {items.length} items purchased
          </p>
        </div>
        {onAddItem && (
          <button
            onClick={onAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        )}
      </div>

      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      <div className="flex gap-1">
        {(['all', 'active', 'purchased'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize',
              filter === f
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="w-6 h-6" />}
          title="No items yet"
          description="Add your first shopping item to get started"
          action={onAddItem ? { label: 'Add Item', onClick: onAddItem } : undefined}
        />
      ) : (
        <div className="space-y-1">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <ShoppingListItem
                key={item.id}
                {...item}
                onToggle={onToggleItem}
                onDelete={onDeleteItem}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
