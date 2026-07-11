'use client'

import type { LucideIcon } from 'lucide-react'
import {
  Sunrise,
  ClipboardCheck,
  ListChecks,
  Activity,
  Sun,
  Dumbbell,
  MessageSquare,
  Brain,
  CalendarCheck,
  Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimeBlock } from '../../types'

const ICON_MAP: Record<string, LucideIcon> = {
  sunrise: Sunrise,
  'clipboard-check': ClipboardCheck,
  'list-checks': ListChecks,
  activity: Activity,
  sun: Sun,
  dumbbell: Dumbbell,
  'message-square': MessageSquare,
  brain: Brain,
  'calendar-check': CalendarCheck,
  moon: Moon,
}

interface TimeBlockCardProps {
  block: TimeBlock
  isActive?: boolean
  onClick?: () => void
}

export function TimeBlockCard({ block, isActive, onClick }: TimeBlockCardProps) {
  const Icon = ICON_MAP[block.icon] ?? ListChecks

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'true' : undefined}
      aria-label={`${block.label} at ${block.time}`}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
        isActive
          ? 'bg-surface-3 border-l-2 border-brand-primary text-white'
          : block.status === 'past'
            ? 'text-[#6B7280] opacity-60 hover:opacity-80 hover:bg-surface-2'
            : 'text-[#9CA3AF] hover:text-white hover:bg-surface-2',
      )}
    >
      <span className="w-9 shrink-0 text-right">
        <span className={cn('text-[11px] font-medium leading-tight', isActive ? 'text-white' : 'text-[#6B7280]')}>
          {block.time}
        </span>
      </span>

      <span className={cn('shrink-0', isActive ? 'text-brand-primary' : 'text-current')}>
        <Icon size={15} />
      </span>

      <span className="text-xs font-medium truncate">{block.label}</span>
    </button>
  )
}
