'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const ExerciseLibrary = dynamic(
  () => import('@/features/coach/components/workouts/ExerciseLibrary'),
  { ssr: false },
)

export default function ExercisesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-6xl mx-auto space-y-5">
          <div className="h-7 w-48 bg-white/5 rounded animate-pulse" />
          <div className="h-10 w-full bg-white/5 rounded-lg animate-pulse" />
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-7 w-16 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface-2 rounded-xl border border-white/5 p-4 animate-pulse space-y-3">
                <div className="h-4 w-2/3 bg-white/5 rounded" />
                <div className="h-3 w-full bg-white/5 rounded" />
                <div className="h-3 w-4/5 bg-white/5 rounded" />
                <div className="flex gap-1.5 pt-1">
                  <div className="h-4 w-14 bg-white/5 rounded-md" />
                  <div className="h-4 w-14 bg-white/5 rounded-md" />
                </div>
                <div className="flex justify-between pt-3 border-t border-white/5">
                  <div className="h-3 w-16 bg-white/5 rounded" />
                  <div className="h-3 w-14 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <ExerciseLibrary />
    </Suspense>
  )
}
