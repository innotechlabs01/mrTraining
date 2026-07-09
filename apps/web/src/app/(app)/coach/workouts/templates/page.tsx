'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const TemplateGallery = dynamic(
  () => import('@/features/coach/components/workouts/TemplateGallery'),
  { ssr: false },
)

export default function TemplatesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-6xl mx-auto space-y-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-7 w-36 bg-white/5 rounded" />
              <div className="h-4 w-20 bg-white/5 rounded" />
            </div>
            <div className="h-10 w-36 bg-white/5 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface-2 rounded-xl border border-white/5 p-5 space-y-3">
                <div className="h-5 w-2/3 bg-white/5 rounded" />
                <div className="h-4 w-20 bg-white/5 rounded-full" />
                <div className="h-3 w-1/2 bg-white/5 rounded" />
                <div className="h-3 w-1/3 bg-white/5 rounded" />
                <div className="h-3 w-full bg-white/5 rounded" />
                <div className="flex justify-between pt-3 border-t border-white/5">
                  <div className="h-8 w-24 bg-white/5 rounded-lg" />
                  <div className="h-8 w-8 bg-white/5 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <TemplateGallery />
    </Suspense>
  )
}
