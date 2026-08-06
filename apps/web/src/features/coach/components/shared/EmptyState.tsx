'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-4 text-center',
      className,
    )}>
      {Icon && (
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-3 ring-1 ring-surface-4 mb-5">
          <Icon className="w-7 h-7 text-text-muted" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-text-primary mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-sm mb-5">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 rounded-xl bg-brand-primary text-white text-sm font-medium hover:brightness-110 transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export function EmptyStateInline({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex items-center gap-4 p-5 rounded-2xl border border-dashed border-surface-4 bg-surface-2/50">
      {Icon && (
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-surface-3">
          <Icon className="w-5 h-5 text-text-muted" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-brand-primary/10 text-brand-primary text-xs font-medium hover:bg-brand-primary/20 transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
