'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3 text-white/20">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white/60 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-white/30 max-w-sm">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  )
}
