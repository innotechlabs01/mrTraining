'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const ScheduleView = dynamic(
  () => import('@/features/coach/components/workouts/ScheduleView'),
  { ssr: false },
)

export default function SchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-6xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <div className="h-7 w-56 bg-white/5 rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-7 w-7 bg-white/5 rounded-lg animate-pulse" />
              <div className="h-7 w-7 bg-white/5 rounded-lg animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 h-16 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-2 rounded-xl border border-white/5 p-4 animate-pulse space-y-3">
              <div className="h-5 w-48 bg-white/5 rounded" />
              <div className="h-3 w-32 bg-white/5 rounded" />
              <div className="flex gap-1.5">
                <div className="w-7 h-7 rounded-full bg-white/5" />
                <div className="w-7 h-7 rounded-full bg-white/5" />
              </div>
              <div className="flex gap-2 pt-1">
                <div className="h-7 w-20 bg-white/5 rounded-lg" />
                <div className="h-7 w-16 bg-white/5 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      }
    >
      <ScheduleView />
    </Suspense>
  )
}
