'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Flame,
  Heart,
  Loader2,
  MapPin,
  Mountain,
  Timer,
  Footprints,
  Gauge,
} from 'lucide-react'
import { useRunningSession, useDeleteRunningSession } from '@/features/running/hooks/useRunning'
import { RunningRouteMap, type GpsPoint } from '@/features/running/components/RunningRouteMap'
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSessionDate,
  sourceLabel,
} from '@/features/running/utils/format'

const EARTH_RADIUS_M = 6371000

function haversineMeters(a: GpsPoint, b: GpsPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

interface Split {
  km: number
  seconds: number
  pace: string
}

/** Splits per km from raw GPS points (timestamp + cumulative distance). */
function computeSplits(points: GpsPoint[]): Split[] {
  const sorted = [...points].sort((a, b) =>
    (a.timestamp ?? '').localeCompare(b.timestamp ?? '')
  )
  const splits: Split[] = []
  if (sorted.length < 2) return splits

  let cumM = 0
  let splitStartM = 0
  let splitStartT = Date.parse(sorted[0].timestamp ?? '')
  let nextKm = 1

  for (let i = 1; i < sorted.length; i++) {
    cumM += haversineMeters(sorted[i - 1], sorted[i])
    const nowT = Date.parse(sorted[i].timestamp ?? '')
    while (cumM >= nextKm * 1000) {
      const seconds = Math.max(1, Math.round((nowT - splitStartT) / 1000))
      splits.push({
        km: nextKm,
        seconds,
        pace: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
      })
      splitStartM = nextKm * 1000
      splitStartT = nowT
      nextKm++
    }
    void splitStartM
  }
  return splits
}

function Metric({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: React.ElementType
  label: string
  value: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
    >
      <div className="flex items-center gap-2 text-white/50">
        <Icon size={14} />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </motion.div>
  )
}

export default function RunningSessionDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const { data, isLoading, error } = useRunningSession(id)
  const deleteMutation = useDeleteRunningSession()

  const session = data?.session
  const gpsPoints = useMemo(() => data?.gpsPoints ?? [], [data])

  const splits = useMemo(() => computeSplits(gpsPoints), [gpsPoints])

  const handleDelete = () => {
    if (!session) return
    if (!window.confirm('¿Eliminar esta carrera? Esta acción no se puede deshacer.')) return
    deleteMutation.mutate(session.id, {
      onSuccess: () => {
        window.location.href = '/running'
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          No se pudo cargar la carrera. Verificá que exista y te pertenezca.
        </div>
        <Link href="/running" className="mt-4 inline-flex items-center gap-1 text-sm text-brand-primary">
          <ArrowLeft size={14} /> Volver a Running
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/running"
        className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 hover:text-white"
      >
        <ArrowLeft size={14} /> Running
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{formatDistance(session.distance)}</h1>
          <p className="mt-1 text-sm text-white/50">
            {formatSessionDate(session.date)} · {sourceLabel(session.source)}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
        >
          {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
        </button>
      </div>

      {/* Mapa completo */}
      <div className="mb-6 overflow-hidden rounded-xl border border-white/[0.06]">
        <RunningRouteMap
          points={gpsPoints.length > 0 ? gpsPoints : session.gpsRoute ?? ''}
          height="420px"
          fitBounds
        />
      </div>

      {/* Métricas */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric icon={Timer} label="Tiempo" value={formatDuration(session.duration)} delay={0} />
        <Metric icon={Gauge} label="Ritmo" value={formatPace(session.pace)} delay={0.05} />
        <Metric icon={Flame} label="Calorías" value={session.calories > 0 ? `${session.calories} kcal` : '—'} delay={0.1} />
        <Metric icon={Mountain} label="Elevación" value={session.elevation > 0 ? `+${Math.round(session.elevation)} m` : '—'} delay={0.15} />
        <Metric icon={Heart} label="FC promedio" value={session.heartRate > 0 ? `${session.heartRate} bpm` : '—'} delay={0.2} />
        <Metric icon={Footprints} label="Cadencia" value={session.cadence > 0 ? `${session.cadence} spm` : '—'} delay={0.25} />
        <Metric icon={Gauge} label="Velocidad" value={session.speed > 0 ? `${session.speed.toFixed(1)} km/h` : '—'} delay={0.3} />
        <Metric icon={MapPin} label="Puntos GPS" value={gpsPoints.length > 0 ? String(gpsPoints.length) : '—'} delay={0.35} />
      </div>

      {/* Splits por km */}
      {splits.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">Splits por km</h2>
          <div className="flex flex-col gap-1.5">
            {splits.map((sp) => (
              <div key={sp.km} className="flex items-center gap-3 text-sm">
                <span className="w-8 text-white/40">{sp.km}</span>
                {/* Barra relativa al split más rápido */}
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-brand-primary/70"
                    style={{
                      width: `${Math.min(100, (fastestPaceSeconds(splits) / sp.seconds) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-14 text-right font-mono text-white/80">{sp.pace}</span>
                <span className="w-16 text-right text-white/30">{formatDuration(sp.seconds)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function fastestPaceSeconds(splits: Split[]): number {
  return splits.reduce((min, s) => Math.min(min, s.seconds), Infinity)
}
