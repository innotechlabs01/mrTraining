'use client'

import { useMemo, type ComponentType, Suspense } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { TimeBlockId } from '@/features/coach/types'
import { useToday } from '@/features/coach/hooks/useToday'
import { TimeBlockContent } from '@/features/coach/components/timeline/TimeBlockContent'

const BLOCK_COMPONENTS: Partial<Record<TimeBlockId, ComponentType>> = {
  'morning-brief': dynamic(() => import('@/features/coach/components/morning-brief/MorningBrief')),
  'check-in': dynamic(() => import('@/features/coach/components/check-in/AthleteCheckIn')),
  'session-prep': dynamic(() => import('@/features/coach/components/session-prep/SessionPrep')),
  'live-session': dynamic(() => import('@/features/coach/components/live-session/LiveSession')),
  'mid-day': dynamic(() => import('@/features/coach/components/mid-day/MidDayReview')),
  'program-design': dynamic(() => import('@/features/coach/components/program-design/ProgramDesign')),
  'communication': dynamic(() => import('@/features/coach/components/communication/Communication')),
  'insights': dynamic(() => import('@/features/coach/components/insights/AIInsights')),
  'daily-summary': dynamic(() => import('@/features/coach/components/daily-summary/DailySummary')),
}

const BLOCK_LABELS: Record<string, string> = {
  'morning-brief': 'Morning Brief',
  'check-in': 'Athlete Check-in',
  'session-prep': 'Session Prep',
  'live-session': 'Live Sessions',
  'mid-day': 'Mid-day Review',
  'program-design': 'Program Design',
  'communication': 'Communication',
  'insights': 'AI Insights',
  'daily-summary': 'Daily Summary',
}

function BlockFallback({ blockId }: { blockId: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="glass-card rounded-xl p-8 max-w-sm">
        <p className="text-lg font-semibold text-white">Block not found</p>
        <p className="text-sm text-[#6B7280] mt-2">
          &ldquo;{blockId}&rdquo; doesn&rsquo;t match any time block.
        </p>
        <p className="text-xs text-[#6B7280] mt-1">
          Select a block from the sidebar.
        </p>
      </div>
    </div>
  )
}

function BlockView({ blockId }: { blockId: string }) {
  const { blocks } = useToday()
  const block = blocks.find((b) => b.id === blockId)

  const Component = useMemo(() => {
    return BLOCK_COMPONENTS[blockId as TimeBlockId] ?? null
  }, [blockId])

  if (!block) {
    return <BlockFallback blockId={blockId} />
  }

  return (
    <TimeBlockContent key={blockId}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <div className="w-5 h-5 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />
          </div>
        }
      >
        {Component ? (
          <Component />
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-sm text-[#6B7280]">{BLOCK_LABELS[blockId] ?? block.label}</p>
              <p className="text-xs text-[#6B7280] mt-0.5">Content coming soon</p>
            </div>
          </div>
        )}
      </Suspense>
    </TimeBlockContent>
  )
}

export default function CoachBlockPage() {
  const params = useParams()
  const blockId = params.block as string

  return <BlockView blockId={blockId} />
}
