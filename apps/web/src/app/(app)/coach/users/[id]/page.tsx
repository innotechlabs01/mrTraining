'use client'

import { useParams } from 'next/navigation'
import { useAthletes } from '@/features/coach/hooks/useAthletes'
import { AthleteResumenPanel } from '@/features/coach/components/insights/AthleteResumenPanel'
import { AthleteTrainingPanels } from '@/features/coach/components/insights/AthleteTrainingPanels'
import { AthleteHealthPanels } from '@/features/coach/components/insights/AthleteHealthPanels'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CoachUserDetailPage() {
  const params = useParams()
  const { getAthleteById } = useAthletes()
  const athlete = getAthleteById(params.id as string)

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

      {/* Panel 1: Resumen dinámico (reemplaza el grid hardcodeado) */}
      <AthleteResumenPanel athleteId={athlete.id} />

      {/* Panel 2-4: Entrenamiento (progresión + fatiga + esfuerzo) */}
      <AthleteTrainingPanels athleteId={athlete.id} />

      {/* Panel 5-6: Salud del reloj (HRV/sueño/zones + videos) */}
      <AthleteHealthPanels athleteId={athlete.id} />
    </div>
  )
}
