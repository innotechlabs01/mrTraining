'use client'

import { useParams } from 'next/navigation'
import { useAthletes } from '@/features/coach/hooks/useAthletes'
import { AthleteTrainingPanels } from '@/features/coach/components/insights/AthleteTrainingPanels'
import { ArrowLeft, Activity, Clock, Award, MessageSquare } from 'lucide-react'
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link
        href="/coach/users"
        className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60"
      >
        <ArrowLeft size={14} />
        Volver a usuarios
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-primary/30 to-brand-primary/10 flex items-center justify-center text-lg font-bold text-brand-primary">
          {athlete.name.split(' ').map((n) => n[0]).join('')}
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-white">{athlete.name}</h1>
          <p className="text-sm text-white/40">{athlete.sport}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/5 bg-surface-1 p-4 text-center">
          <p className="text-2xl font-bold text-white font-display">{athlete.readiness.score}%</p>
          <p className="text-xs text-white/40 mt-1">Readiness</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-surface-1 p-4 text-center">
          <p className="text-2xl font-bold text-white font-display">{athlete.readiness.hrv}</p>
          <p className="text-xs text-white/40 mt-1">HRV</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-surface-1 p-4 text-center">
          <p className="text-2xl font-bold text-white font-display">{athlete.readiness.sleep}h</p>
          <p className="text-xs text-white/40 mt-1">Sueño</p>
        </div>
      </div>

      <AthleteTrainingPanels athleteId={athlete.id} />

      <div className="rounded-2xl border border-white/5 bg-surface-1 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white/70">Acciones rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Activity, label: 'Ver sesiones' },
            { icon: Award, label: 'Progreso' },
            { icon: MessageSquare, label: 'Mensaje' },
            { icon: Clock, label: 'Historial' },
          ].map((action) => (
            <button
              key={action.label}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/5 hover:bg-white/[0.03] transition-colors"
            >
              <action.icon size={18} className="text-white/40" />
              <span className="text-xs text-white/40">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
