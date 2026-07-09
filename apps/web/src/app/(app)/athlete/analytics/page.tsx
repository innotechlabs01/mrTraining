'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const WorkoutAnalytics = dynamic(
  () => import('@/features/athlete').then((m) => ({ default: m.WorkoutAnalytics })),
  { ssr: false },
)

function AnalyticsSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 bg-white/5 rounded-xl w-1/3" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-white/5 rounded-2xl" />
        ))}
      </div>
      <div className="h-52 bg-white/5 rounded-2xl" />
      <div className="h-32 bg-white/5 rounded-2xl" />
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <WorkoutAnalytics />
    </Suspense>
  )
}
