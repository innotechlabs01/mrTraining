'use client'

import { useEffect, type ComponentType, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useToday } from '@/features/coach/hooks/useToday'
import type { TimeBlockId } from '@/features/coach/types'
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

function CurrentBlockView() {
  const { currentBlock } = useToday()
  const router = useRouter()

  useEffect(() => {
    if (currentBlock) {
      router.replace(`/coach/today/${currentBlock.id}`)
    }
  }, [currentBlock, router])

  if (!currentBlock) {
    return (
      <TimeBlockContent>
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-[#6B7280]">No time blocks available</div>
        </div>
      </TimeBlockContent>
    )
  }

  const Component = BLOCK_COMPONENTS[currentBlock.id]

  return (
    <TimeBlockContent key={currentBlock.id}>
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
              <p className="text-sm text-[#6B7280]">{currentBlock.label}</p>
              <p className="text-xs text-[#6B7280] mt-0.5">Content coming soon</p>
            </div>
          </div>
        )}
      </Suspense>
    </TimeBlockContent>
  )
}

export default function CoachTodayPage() {
  return <CurrentBlockView />
}
