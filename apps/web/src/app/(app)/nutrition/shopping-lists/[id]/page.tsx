'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Trash2, CheckCircle, Circle } from 'lucide-react'
import { useShoppingList } from '@/features/nutrition/data/hooks'

export default function ShoppingListDetailPage({ params }: { params: { id: string } }) {
  const { item: list, loading } = useShoppingList(params.id)
  const [purchased, setPurchased] = useState<Set<string>>(new Set())

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" /></div>
  if (!list) return <div className="flex items-center justify-center min-h-[60vh] text-white/40">Shopping list not found</div>

  const purchasedCount = list.items.filter((i) => i.isPurchased || purchased.has(i.id)).length
  const categories = [...new Set(list.items.map((i) => i.category))]

  const toggleItem = (itemId: string) => {
    setPurchased((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  return (
    <motion.div className="max-w-3xl mx-auto p-4 space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/nutrition/shopping-lists" className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div>
            <h1 className="text-lg font-semibold text-white">{list.name}</h1>
            <p className="text-xs text-white/40">{purchasedCount}/{list.items.length} items purchased</p>
          </div>
        </div>
        <button className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-red-400 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-primary transition-all duration-500"
          style={{ width: `${(purchasedCount / Math.max(list.items.length, 1)) * 100}%` }}
        />
      </div>

      <div className="space-y-4">
        {categories.map((category) => {
          const categoryItems = list.items.filter((i) => i.category === category)
          return (
            <div key={category}>
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 capitalize">{category}</h3>
              <div className="space-y-1">
                {categoryItems.map((item) => {
                  const isDone = item.isPurchased || purchased.has(item.id)
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left ${
                        isDone ? 'bg-white/5' : 'bg-surface-1 hover:bg-white/5'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle className="w-4 h-4 text-brand-primary shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-white/20 shrink-0" />
                      )}
                      <span className={`text-sm ${isDone ? 'text-white/30 line-through' : 'text-white/80'}`}>
                        {item.name}
                      </span>
                      <span className={`ml-auto text-xs ${isDone ? 'text-white/20' : 'text-white/40'}`}>
                        {item.quantity} {item.unit}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
