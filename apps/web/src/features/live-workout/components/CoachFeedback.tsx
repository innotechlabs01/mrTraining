'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Lightbulb, Heart, AlertTriangle, Sparkles } from 'lucide-react'
import type { CueTone } from '../types'
import { cn } from '@/lib/utils'

interface CoachFeedbackProps {
  coachInitials: string
  coachName: string
  text: string
  tone: CueTone
  pulse?: boolean
}

const TONE_STYLES: Record<CueTone, { ring: string; chip: string; label: string; icon: React.ReactNode }> = {
  tip: { ring: 'bg-blue-500/15 text-blue-300', chip: 'bg-blue-500/10 text-blue-300', label: 'Coach Tip', icon: <Lightbulb className="h-3 w-3" /> },
  praise: { ring: 'bg-green-500/15 text-green-300', chip: 'bg-green-500/10 text-green-300', label: 'Nice', icon: <Heart className="h-3 w-3" /> },
  correction: { ring: 'bg-orange-500/15 text-orange-300', chip: 'bg-orange-500/10 text-orange-300', label: 'Adjust', icon: <AlertTriangle className="h-3 w-3" /> },
  motivation: { ring: 'bg-violet-500/15 text-violet-300', chip: 'bg-violet-500/10 text-violet-300', label: 'Push', icon: <Sparkles className="h-3 w-3" /> },
}

export function CoachFeedback({ coachInitials, coachName, text, tone, pulse }: CoachFeedbackProps) {
  const style = TONE_STYLES[tone]

  return (
    <div className="rounded-3xl border border-white/5 bg-surface-1 p-4">
      <div className="flex items-start gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold', style.ring, pulse && 'animate-glow-pulse')}>
          {coachInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', style.chip)}>
              {style.icon}
              {style.label}
            </span>
            <span className="text-[10px] text-white/30">{coachName}</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={text}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-sm leading-relaxed text-white/85"
            >
              {text}
            </motion.p>
          </AnimatePresence>
        </div>
        <MessageSquare className="h-4 w-4 shrink-0 text-white/10" />
      </div>
    </div>
  )
}
