'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AlertCircle, ArrowLeft, CheckCircle, MapPin, Timer } from 'lucide-react'
import { goFetch, subscribeRunningLive, type RunningLiveEvent } from '@/features/shared/api/client'
import { RunningRouteMap } from '@/features/running/components/RunningRouteMap'

interface RunningInterval {
  order: number
  workType: 'time' | 'distance'
  workValue: number
  restSeconds: number
  paceTarget?: string
  intensity?: string
}

interface RunningExerciseDetail {
  id: string
  name: string
  prescribedGpsRoute: string
  prescribedIntervals: RunningInterval[]
  actualGpsRoute: string
  actualIntervals: RunningInterval[]
}

interface RunningWorkoutDetail {
  workout_id: string
  athlete_id: string
  workout_name: string
  status: string
  completed_at: string
  duration_seconds: number
  running_exercises: RunningExerciseDetail[]
}

function formatDuration(seconds: number): string {
  if (!seconds) return '–'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatClock(seconds: number): string {
  if (!seconds) return '–'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatInterval(iv: RunningInterval): string {
  return iv.workType === 'time' ? formatClock(iv.workValue) : `${iv.workValue.toFixed(2)} km`
}

function sumDistance(intervals: RunningInterval[]): string {
  const total = intervals.reduce(
    (acc, iv) => acc + (iv.workType === 'distance' ? iv.workValue : 0),
    0
  )
  return total > 0 ? `${total.toFixed(2)} km` : '–'
}

function sumTime(intervals: RunningInterval[]): string {
  const total = intervals.reduce(
    (acc, iv) => acc + (iv.workType === 'time' ? iv.workValue : 0),
    0
  )
  return total > 0 ? formatClock(total) : '–'
}

const INTENSITY_CLASSES: Record<string, string> = {
  easy: 'bg-green-500/20 text-green-400',
  tempo: 'bg-yellow-500/20 text-yellow-400',
  threshold: 'bg-orange-500/20 text-orange-400',
  vo2max: 'bg-red-500/20 text-red-400',
}

function ComparisonCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white/5 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-lg font-bold text-white font-mono">{value}</p>
    </div>
  )
}

function RouteComparison({ exercise }: { exercise: RunningExerciseDetail }) {
  if (!exercise.prescribedGpsRoute && !exercise.actualGpsRoute) return null

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
        Recorrido GPS
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exercise.prescribedGpsRoute && (
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/40 mb-2">Ruta prescrita</p>
            <RunningRouteMap points={exercise.prescribedGpsRoute} height="220px" />
          </div>
        )}
        {exercise.actualGpsRoute ? (
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/40 mb-2">Recorrido real</p>
            <RunningRouteMap points={exercise.actualGpsRoute} height="220px" />
          </div>
        ) : (
          <div className="bg-white/5 rounded-lg p-3 flex items-center justify-center">
            <p className="text-xs text-white/30">Sin GPS real registrado</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CoachRunningWorkoutDetailPage() {
  const params = useParams()
  const athleteId = params.id as string
  const workoutId = params.workoutId as string
  const [detail, setDetail] = useState<RunningWorkoutDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [liveEvent, setLiveEvent] = useState<RunningLiveEvent | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchDetail = async () => {
      try {
        setLoading(true)
        const data = await goFetch<RunningWorkoutDetail>(
          `/api/v1/workouts/${workoutId}/running-complete`
        )
        if (!cancelled) setDetail(data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar el detalle')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchDetail()
    return () => {
      cancelled = true
    }
  }, [workoutId])

  // SSE subscription for live running progress (coach view). Best-effort:
  // if it fails, the page still works with the initial detail load.
  useEffect(() => {
    if (!detail) return
    const unsub = subscribeRunningLive(workoutId, (ev) => {
      if (ev.type === 'workout.progress') {
        setIsLive(true)
        setLiveEvent(ev)
      }
      if (ev.type === 'workout.completed') {
        setIsLive(false)
        setDetail((d) =>
          d ? { ...d, status: 'completed' } : d
        )
      }
    })
    return () => unsub()
  }, [workoutId, detail])

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 bg-white/10 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-20 bg-white/10 rounded-lg" />
            <div className="h-20 bg-white/10 rounded-lg" />
          </div>
          <div className="h-64 bg-white/10 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-rose-500/20 border border-rose-500/30 rounded-xl p-5">
          <AlertCircle size={24} className="text-rose-400 mx-auto mb-2" />
          <p className="text-center text-sm text-rose-300">{error}</p>
          <Link
            href={`/coach/users/${athleteId}`}
            className="mt-4 block text-center text-brand-primary hover:underline text-sm"
          >
            Volver al perfil del atleta
          </Link>
        </div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white/5 rounded-xl p-5 text-center">
          <p className="text-white/40 text-sm">No hay datos disponibles</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <Link
        href={`/coach/users/${athleteId}`}
        className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60"
      >
        <ArrowLeft size={14} />
        Volver al perfil
      </Link>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold text-white">{detail.workout_name}</h1>
          <p className="text-sm text-white/40 mt-1">
            {detail.completed_at
              ? `Completado el ${new Date(detail.completed_at).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}`
              : 'Sin fecha de finalización'}
            {detail.duration_seconds > 0 && (
              <span className="ml-2">• {formatDuration(detail.duration_seconds)}</span>
            )}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            detail.status === 'completed'
              ? 'bg-emerald-500/20 text-emerald-400'
              : detail.status === 'active'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-amber-500/20 text-amber-400'
          }`}
        >
          {isLive ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              En vivo
            </span>
          ) : detail.status === 'completed'
            ? 'Completado'
            : detail.status === 'active'
              ? 'En progreso'
              : detail.status}
        </span>
      </div>

      {detail.running_exercises.length === 0 ? (
        <div className="bg-white/5 rounded-xl p-8 text-center">
          <MapPin size={32} className="mx-auto text-white/20 mb-2" />
          <p className="text-sm text-white/40">
            Este entrenamiento no incluye ejercicios de running con GPS
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {detail.running_exercises.map((exercise, index) => (
            <div
              key={exercise.id}
              className="bg-white/5 rounded-xl p-5 space-y-4 border border-white/5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-green-400" />
                  <h3 className="text-base font-semibold text-white">{exercise.name}</h3>
                  <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded">
                    Ejercicio {index + 1}
                  </span>
                </div>
                {exercise.actualGpsRoute && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded">
                    <CheckCircle size={10} /> GPS real capturado
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <ComparisonCard
                  label="Distancia prescrita"
                  value={sumDistance(exercise.prescribedIntervals)}
                  icon={<MapPin size={16} className="text-blue-400" />}
                />
                <ComparisonCard
                  label="Distancia real"
                  value={sumDistance(exercise.actualIntervals)}
                  icon={<MapPin size={16} className="text-green-400" />}
                />
                <ComparisonCard
                  label="Tiempo prescrito"
                  value={sumTime(exercise.prescribedIntervals)}
                  icon={<Timer size={16} className="text-blue-400" />}
                />
                <ComparisonCard
                  label="Tiempo real"
                  value={sumTime(exercise.actualIntervals)}
                  icon={<Timer size={16} className="text-green-400" />}
                />
              </div>

              {(exercise.prescribedIntervals.length > 0 ||
                exercise.actualIntervals.length > 0) && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        {['#', 'Tipo', 'Prescrito', 'Real', 'Pace obj.', 'Pace real', 'Intensidad', 'Descanso'].map(
                          (header) => (
                            <th
                              key={header}
                              className="text-left py-2 px-3 text-xs text-white/40 uppercase tracking-wider whitespace-nowrap"
                            >
                              {header}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {exercise.prescribedIntervals.map((prescribed, i) => {
                        const actual = exercise.actualIntervals[i]
                        return (
                          <tr key={prescribed.order ?? i} className="border-b border-white/5">
                            <td className="py-2 px-3 text-white/60">{i + 1}</td>
                            <td className="py-2 px-3 text-white/60 capitalize">
                              {prescribed.workType === 'time' ? 'tiempo' : 'distancia'}
                            </td>
                            <td className="py-2 px-3 text-white">{formatInterval(prescribed)}</td>
                            <td className="py-2 px-3 text-white font-mono">
                              {actual ? formatInterval(actual) : '–'}
                            </td>
                            <td className="py-2 px-3 text-white/60 font-mono">
                              {prescribed.paceTarget || '–'}
                            </td>
                            <td className="py-2 px-3 text-white font-mono">
                              {actual?.paceTarget || '–'}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-xs capitalize ${
                                  INTENSITY_CLASSES[prescribed.intensity ?? ''] ??
                                  'bg-white/10 text-white/50'
                                }`}
                              >
                                {prescribed.intensity || '–'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-white/60">
                              {prescribed.restSeconds > 0 ? `${prescribed.restSeconds}s` : '–'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <RouteComparison exercise={exercise} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
