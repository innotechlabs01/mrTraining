'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  Dumbbell,
  Loader2,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import {
  getAthleteWorkoutDetail,
  getWorkoutAIInsights,
  type AIExerciseInsight,
} from '@/features/shared/api/client'

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const label = value >= 0.7 ? 'Recomendación' : 'Observación'
  const tone =
    value >= 0.7
      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
      : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${tone}`}>
      {label} · {pct}%
    </span>
  )
}

function InsightCard({ insight }: { insight: AIExerciseInsight }) {
  return (
    <div className="mt-3 rounded-lg border border-brand-primary/20 bg-brand-primary/[0.06] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary">
          <Sparkles size={12} /> Sugerencia de IA
        </span>
        <ConfidenceBadge value={insight.confidence} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/40">Carga</p>
          <p className="text-sm font-semibold text-white">
            {insight.suggested_weight_kg > 0 ? `${insight.suggested_weight_kg} kg` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/40">Reps</p>
          <p className="text-sm font-semibold text-white">{insight.suggested_reps}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/40">RIR objetivo</p>
          <p className="text-sm font-semibold text-white">{insight.target_rir}</p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/50">
        {insight.one_rm_kg > 0 && (
          <span className="inline-flex items-center gap-1">
            <TrendingUp size={11} /> 1RM est. {insight.one_rm_kg} kg
          </span>
        )}
        <span>Fatiga {Math.round(insight.fatigue_score)}/100</span>
        {insight.plateau && (
          <span className="inline-flex items-center gap-1 text-amber-300">
            <AlertTriangle size={11} /> Plato detectado
          </span>
        )}
      </div>

      <p className="mt-2 text-xs leading-relaxed text-white/60">{insight.reason}</p>
    </div>
  )
}

export default function AthleteWorkoutDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

  const detailQuery = useQuery({
    queryKey: ['athlete', 'workout', id],
    queryFn: () => getAthleteWorkoutDetail(id),
    enabled: !!id,
    staleTime: 60_000,
  })

  const insightsQuery = useQuery({
    queryKey: ['athlete', 'workout-insights', id],
    queryFn: () => getWorkoutAIInsights(id),
    enabled: !!id,
    staleTime: 60_000,
  })

  const insightsByExercise = new Map(
    (insightsQuery.data?.exercises ?? []).map((i) => [i.exercise_id, i])
  )

  if (detailQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    )
  }

  if (detailQuery.error || !detailQuery.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          No se pudo cargar el entrenamiento. Verificá que esté asignado a vos y
          que tu membresía esté activa.
        </div>
        <Link href="/running" className="mt-4 inline-flex items-center gap-1 text-sm text-brand-primary">
          <ArrowLeft size={14} /> Volver
        </Link>
      </div>
    )
  }

  const { workout, exercises } = detailQuery.data

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{workout.contentName}</h1>
        <p className="mt-1 text-sm text-white/50">
          {workout.startDate} → {workout.endDate} · {workout.status} · {Math.round(workout.progress)}% completado
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2 text-sm text-white/60">
        <Brain size={16} className="text-brand-primary" />
        Sugerencias de IA por ejercicio
        {insightsQuery.isLoading && <Loader2 size={12} className="animate-spin" />}
      </div>

      {insightsQuery.error && (
        <p className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Las sugerencias de IA no están disponibles ahora. Podés entrenar con la
          prescripción original.
        </p>
      )}

      {exercises.length === 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-16 text-center text-sm text-white/40">
          Este entrenamiento no tiene ejercicios cargados.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {exercises.map((ex, i) => {
          const insight = insightsByExercise.get(ex.id)
          return (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Dumbbell size={15} className="text-white/40" />
                  <span className="font-medium text-white">{ex.name}</span>
                  {ex.phase && ex.phase !== 'work' && (
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/40">
                      {ex.phase}
                    </span>
                  )}
                </div>
                <span className="text-xs text-white/50">
                  {ex.sets} × {ex.reps}
                  {ex.weightKg ? ` · ${ex.weightKg} kg` : ''}
                </span>
              </div>

              {ex.notes ? (
                <p className="mt-2 text-xs text-white/40">{ex.notes}</p>
              ) : null}

              {insight ? (
                <InsightCard insight={insight} />
              ) : (
                <p className="mt-2 text-[11px] text-white/30">
                  Sin sugerencia de IA para este ejercicio (todavía sin historial).
                </p>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
