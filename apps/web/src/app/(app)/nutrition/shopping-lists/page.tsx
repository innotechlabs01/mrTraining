'use client'

import { motion } from 'framer-motion'
import { Plus, ShoppingCart } from 'lucide-react'
import { ShoppingListCard } from '@/features/nutrition/components/shopping-list/ShoppingListCard'
import { EmptyState } from '@/features/nutrition/components/shared/EmptyState'
import { useShoppingLists } from '@/features/nutrition/data/hooks'

export default function ShoppingListsPage() {
  const { items: lists, loading } = useShoppingLists()

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" /></div>

  return (
    <motion.div className="max-w-3xl mx-auto p-4 space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Shopping Lists</h1>
          <p className="text-sm text-white/40">{lists.length} lists</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          New List
        </button>
      </div>

      {lists.length === 0 ? (
        <EmptyState icon={<ShoppingCart className="w-6 h-6" />} title="No shopping lists" description="Create your first shopping list" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lists.map((sl) => (
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
      )}
    </motion.div>
  )
}
