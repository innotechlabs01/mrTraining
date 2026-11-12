'use client'

import React, { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { useAthletes } from '@/features/coach/hooks/useAthletes'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// Lazy-loaded panels — not in initial bundle
const AthleteResumenPanel = dynamic(
  () => import('@/features/coach/components/insights/AthleteResumenPanel').then(mod => mod.AthleteResumenPanel),
  { loading: () => <div className="rounded-lg border border-white/5 bg-surface-1 p-5 h-32 animate-pulse" /> },
)
const AthleteTrainingPanels = dynamic(
  () => import('@/features/coach/components/insights/AthleteTrainingPanels').then(mod => mod.AthleteTrainingPanels),
  { loading: () => <div className="rounded-lg border border-white/5 bg-surface-1 p-5 h-32 animate-pulse" /> },
)
const AthleteHealthPanels = dynamic(
  () => import('@/features/coach/components/insights/AthleteHealthPanels').then(mod => mod.AthleteHealthPanels),
  { loading: () => <div className="rounded-lg border border-white/5 bg-surface-1 p-5 h-32 animate-pulse" /> },
)
const AthleteRunningPanel = dynamic(
  () => import('@/features/coach/components/insights/AthleteRunningPanel').then(mod => mod.AthleteRunningPanel),
  { loading: () => <div className="rounded-lg border border-white/5 bg-surface-1 p-5 h-32 animate-pulse" /> },
)

// Per-icon lucide imports (tree-shake friendly)
import { ArrowLeft } from 'lucide-react'

export default function CoachUserDetailPage() {
  const params = useParams()
  const { getAthleteById } = useAthletes()
  const athleteId = params.id as string
  const athlete = getAthleteById(athleteId)

  if (!athlete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <p className="text-lg font-semibold text-white">Atleta no encontrado</p>
        <Link href="/coach/users" className="text-sm text-brand-primary mt-2 hover:underline">
          Volver a usuarios
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <Link
        href="/coach/users"
        className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60"
      >
        <ArrowLeft size={14} />
        Volver a usuarios
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-primary/30 to-brand-primary/10 flex items-center justify-center text-lg font-bold text-brand-primary">
          {athlete.name.split(' ').map((n) => n[0]).join('')}
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-white">{athlete.name}</h1>
          <p className="text-sm text-white/40">{athlete.sport}</p>
        </div>
      </div>

      <Suspense fallback={<div className="h-32 animate-pulse" />}>
        <AthleteResumenPanel athleteId={athlete.id} />
      </Suspense>

      <Suspense fallback={<div className="h-32 animate-pulse" />}>
        <AthleteTrainingPanels athleteId={athlete.id} />
      </Suspense>

      <Suspense fallback={<div className="h-32 animate-pulse" />}>
        <AthleteHealthPanels athleteId={athlete.id} />
      </Suspense>

      <Suspense fallback={<div className="h-32 animate-pulse" />}>
        <AthleteRunningPanel athleteId={athlete.id} />
      </Suspense>

      {/* Gamificación — inline, lightweight */}
      <section className="bg-white/5 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
          Gamificación
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-brand-primary">—</p>
            <p className="text-xs text-white/40 mt-1">Racha actual</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-brand-primary">—</p>
            <p className="text-xs text-white/40 mt-1">Racha máxima</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-brand-primary">—</p>
            <p className="text-xs text-white/40 mt-1">Badges</p>
          </div>
        </div>
      </section>
    </div>
  )
}
