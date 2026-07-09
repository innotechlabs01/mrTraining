'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const WorkoutBuilder = dynamic(
  () => import('@/features/coach/components/workouts/WorkoutBuilder'),
  { ssr: false },
)

export default function BuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-6xl mx-auto space-y-5 animate-pulse">
          <div className="h-7 w-48 bg-white/5 rounded" />
          <div className="flex gap-6">
            <div className="w-[40%] space-y-3">
              <div className="h-10 w-full bg-white/5 rounded-lg" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-surface-2 rounded-xl border border-white/5" />
              ))}
            </div>
            <div className="flex-1 space-y-3">
              <div className="h-10 w-full bg-surface-2 rounded-lg border border-white/5" />
              <div className="h-10 w-40 bg-surface-2 rounded-lg border border-white/5" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-surface-2 rounded-xl border border-white/5" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <WorkoutBuilder />
    </Suspense>
  )
}
