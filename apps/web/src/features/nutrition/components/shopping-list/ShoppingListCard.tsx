'use client'

import { motion } from 'framer-motion'
import { ShoppingCart, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShoppingListCardProps {
  id: string
  name: string
  description?: string
  itemCount: number
  purchasedCount: number
  createdAt: string
  onClick?: (id: string) => void
  className?: string
}

export function ShoppingListCard({
  id,
  name,
  description,
  itemCount,
  purchasedCount,
  createdAt,
  onClick,
  className,
}: ShoppingListCardProps) {
  const progress = itemCount > 0 ? Math.round((purchasedCount / itemCount) * 100) : 0
  const date = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <motion.button
      onClick={() => onClick?.(id)}
      className={cn(
        'w-full rounded-xl border border-white/5 bg-surface-1 p-4 text-left',
        'hover:border-white/10 hover:shadow-md transition-all duration-200',
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand-primary/20 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-brand-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{name}</h3>
            {description && (
              <p className="text-xs text-white/40">{description}</p>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-white/20" />
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/40">
            {purchasedCount} / {itemCount} items
          </span>
          <span className="text-white/30">{date}</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.button>
  )
}
