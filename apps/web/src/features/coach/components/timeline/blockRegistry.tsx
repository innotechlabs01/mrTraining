'use client'

import { type ComponentType, Suspense } from 'react'
import dynamic from 'next/dynamic'
import type { TimeBlockId } from '@/features/coach/types'

export const BLOCK_COMPONENTS: Partial<Record<TimeBlockId, ComponentType>> = {
  'morning-brief': dynamic(() => import('@/features/coach/components/morning-brief/MorningBrief')),
  'check-in': dynamic(() => import('@/features/coach/components/check-in/AthleteCheckIn')),
  'session-prep': dynamic(() => import('@/features/coach/components/session-prep/SessionPrep')),
  'live-session': dynamic(() => import('@/features/coach/components/live-session/LiveSession')),
  'mid-day': dynamic(() => import('@/features/coach/components/mid-day/MidDayReview')),
  'program-design': dynamic(() => import('@/features/coach/components/program-design/ProgramDesign')),
  'communication': dynamic(() => import('@/features/coach/components/communication/Communication')),
  'insights': dynamic(() => import('@/features/coach/components/insights/AIInsights')),
  'daily-summary': dynamic(() => import('@/features/coach/components/daily-summary/DailySummary')),
  'evening-recap': dynamic(() => import('@/features/coach/components/evening-recap/EveningRecap')),
}

export const BLOCK_LABELS: Record<string, string> = {
  'morning-brief': 'Morning Brief',
  'check-in': 'Athlete Check-in',
  'session-prep': 'Session Prep',
  'live-session': 'Live Sessions',
  'mid-day': 'Mid-day Review',
  'program-design': 'Program Design',
  communication: 'Communication',
  insights: 'AI Insights',
  'daily-summary': 'Daily Summary',
  'evening-recap': 'Evening Recap',
}

export const BLOCK_FALLBACK = (
  <div className="flex items-center justify-center h-64">
    <div className="w-5 h-5 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />
  </div>
)

export function BlockSuspense({ blockId }: { blockId: TimeBlockId }) {
  const Component = BLOCK_COMPONENTS[blockId] ?? null
  return (
    <Suspense fallback={BLOCK_FALLBACK}>
      {Component ? (
        <Component />
      ) : (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-sm text-white/40">{BLOCK_LABELS[blockId] ?? blockId}</p>
            <p className="text-xs text-white/30 mt-0.5">Contenido próximamente</p>
          </div>
        </div>
      )}
    </Suspense>
  )
}
