'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { Activity, CalendarDays, Flame, MapPin, Timer, ChevronRight, Loader2 } from 'lucide-react'
import { useRunningSessions, useRunningStats } from '@/features/running/hooks/useRunning'
import { RunningRouteMap } from '@/features/running/components/RunningRouteMap'
import { LiveRunTracker } from '@/features/running/components/LiveRunTracker'
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSessionDate,
  sourceLabel,
} from '@/features/running/utils/format'

function StatCard({
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
    >
      <div className="flex items-center gap-2 text-white/50">
        <Icon size={14} />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </motion.div>
  )
}

export default function RunningHistoryPage() {
  const qc = useQueryClient()
  const { data: stats, isLoading: statsLoading } = useRunningStats()
  const { data, isLoading, error } = useRunningSessions(1, 50)

  const handleRunFinished = () => {
    qc.invalidateQueries({ queryKey: ['running'] })
  }

  // getRunningSessions already unwraps the API envelope → RunningSession[].
  const sessions = data ?? []

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Running</h1>
          <p className="mt-1 text-sm text-white/50">Historial de carreras con ruta GPS</p>
        </div>
      </div>

      {/* Grabación en vivo desde el navegador */}
      <div className="mb-8">
        <LiveRunTracker onFinished={handleRunFinished} />
      </div>

      {/* Stats globales */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={MapPin} label="Distancia total" delay={0} value={statsLoading ? '…' : formatDistance(stats?.totalDistance ?? 0)} />
        <StatCard icon={CalendarDays} label="Sesiones" delay={0.05} value={statsLoading ? '…' : String(stats?.totalSessions ?? 0)} />
        <StatCard icon={Timer} label="Ritmo promedio" delay={0.1} value={statsLoading ? '…' : formatPace(stats?.avgPace)} />
        <StatCard icon={Flame} label="Calorías" delay={0.15} value={statsLoading ? '…' : String(stats?.totalCalories ?? 0)} />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          No se pudo cargar el historial de carreras. Intenta de nuevo.
        </div>
      )}

      {!isLoading && !error && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] py-20 text-center">
          <Activity className="mb-3 h-10 w-10 text-white/20" />
          <p className="text-white/60">Todavía no registraste carreras</p>
          <p className="mt-1 text-sm text-white/40">
            Graba una desde la app móvil o registra una manualmente
          </p>
        </div>
      )}

      {/* Lista de sesiones con mini-mapa */}
      <div className="flex flex-col gap-3">
        {sessions.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.4) }}
          >
            <Link
              href={`/running/${s.id}`}
              className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 transition-colors hover:border-brand-primary/40 hover:bg-white/[0.05]"
            >
              {/* Mini-mapa o fallback */}
              <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-black/40">
                {s.gpsRoute ? (
                  <RunningRouteMap
                    points={s.gpsRoute}
                    height="80px"
                    thumbnail
                    showMarkers={false}
                    className="h-full w-full"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-white/20">
                    <MapPin size={18} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{formatDistance(s.distance)}</span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                    {sourceLabel(s.source)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/40">
                  {formatSessionDate(s.date)} · {formatDuration(s.duration)} · {formatPace(s.pace)}
                </p>
                <div className="mt-1 flex gap-3 text-[11px] text-white/30">
                  {s.calories > 0 && <span>{s.calories} kcal</span>}
                  {s.elevation > 0 && <span>+{Math.round(s.elevation)} m</span>}
                  {s.heartRate > 0 && <span>{s.heartRate} bpm</span>}
                </div>
              </div>

              <ChevronRight size={16} className="shrink-0 text-white/20 transition-colors group-hover:text-brand-primary" />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
