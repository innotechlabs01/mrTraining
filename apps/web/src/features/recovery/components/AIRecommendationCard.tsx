'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Moon,
  Droplets,
  Dumbbell,
  Apple,
  Brain,
  X,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AIRecommendation } from '../types'

const typeConfig: Record<string, { icon: typeof Sparkles; color: string; bg: string }> = {
  sleep: { icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  recovery: { icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  hydration: { icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  training: { icon: Dumbbell, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  nutrition: { icon: Apple, color: 'text-green-400', bg: 'bg-green-500/10' },
  general: { icon: Sparkles, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
}

const priorityBorder: Record<string, string> = {
  high: 'border-l-error',
  medium: 'border-l-warning',
  low: 'border-l-white/10',
}

export default function AIRecommendationCard({
  recommendation,
  onDismiss,
  index = 0,
}: {
  recommendation: AIRecommendation
  onDismiss?: (id: string) => void
  index?: number
}) {
  const config = typeConfig[recommendation.type] || typeConfig.general
  const Icon = config.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: 'easeOut' }}
      className={cn(
        'relative rounded-xl p-4 bg-surface-1 border border-white/5 border-l-2 overflow-hidden',
        priorityBorder[recommendation.priority]
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', config.bg)}>
          <Icon className={cn('w-4 h-4', config.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-sm font-semibold text-white">{recommendation.title}</h4>
            <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-orange-400">
              AI
            </span>
            {recommendation.priority === 'high' && (
              <span className="rounded bg-error/15 px-1.5 py-0.5 text-[10px] font-semibold text-error">
                High
              </span>
            )}
          </div>

          <p className="text-xs text-white/60 leading-relaxed mt-1">{recommendation.description}</p>

          <details className="mt-2 group">
            <summary className="text-[10px] text-white/30 hover:text-white/50 cursor-pointer flex items-center gap-1 transition-colors">
              <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
              Why
            </summary>
            <p className="text-[10px] text-white/30 mt-1 leading-relaxed">{recommendation.reasoning}</p>
          </details>

          {recommendation.actionLabel && (
            <button className="mt-2 px-3 py-1 rounded-md bg-orange-500/15 text-orange-400 text-[10px] font-medium hover:bg-orange-500/25 transition-colors">
              {recommendation.actionLabel}
            </button>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={() => onDismiss(recommendation.id)}
            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
          >
            <X className="w-3 h-3 text-white/30" />
          </button>
        )}
      </div>
    </motion.div>
  )
}
