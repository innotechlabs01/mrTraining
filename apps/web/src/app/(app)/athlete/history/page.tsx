'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const WorkoutHistory = dynamic(
  () => import('@/features/athlete').then((m) => ({ default: m.WorkoutHistory })),
  { ssr: false },
)

function HistorySkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 bg-white/5 rounded-xl w-1/3" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 bg-white/5 rounded-2xl" />
      ))}
    </div>
  )
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<HistorySkeleton />}>
      <WorkoutHistory />
    </Suspense>
  )
}
