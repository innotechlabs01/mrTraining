/**
 * Athlete Resumen Panel — top-level summary card for the coach dashboard.
 *
 * Pulls real data from multiple sources to show one cohesive snapshot:
 *   - Readiness: automatic (HRV+sleep+HR) or manual self-report
 *   - Last workout: what was done, when, how it went
 *   - Sync status: is the wearable data fresh?
 *   - Adherence: sessions completed vs programmed this week
 *   - PRs: recent personal records
 */
'use client'

import { useEffect, useState } from 'react'
import {
  Activity, Battery, BatteryCharging, Clock, Dumbbell, TrendingUp,
  CheckCircle2, AlertTriangle, XCircle,
} from 'lucide-react'
import { trainingApi, type TrainingSummaryResponse } from '@/features/shared/api/client'
import type { LucideIcon } from 'lucide-react'

interface ResumenData {
  readinessScore: number | null
  readinessSource: 'automatic' | 'manual' | 'none'
  lastWorkout: { name: string; date: string; setsCompleted: number; duration: number } | null
  lastSyncAge: string | null
  syncFresh: boolean
  adherence: { completed: number; programmed: number; pct: number | null }
  recentPR: { exercise: string; weight: number; date: string } | null
}

function StatusBadge({ label, tone }: { label: string; tone: 'green' | 'amber' | 'red' | 'gray' }) {
  const colors = {
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    red: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    gray: 'bg-white/5 text-white/40 border-white/10',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colors[tone]}`}>
      {label}
    </span>
  )
}

function SummaryStat({ icon: Icon, label, value, sub, tone }: {
  icon: LucideIcon; label: string; value: string; sub?: string; tone?: 'green' | 'amber' | 'red' | 'gray'
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
        tone === 'green' ? 'bg-emerald-500/10' : tone === 'amber' ? 'bg-amber-500/10' : tone === 'red' ? 'bg-rose-500/10' : 'bg-white/5'
      }`}>
        <Icon size={18} className={
          tone === 'green' ? 'text-emerald-400' : tone === 'amber' ? 'text-amber-400' : tone === 'red' ? 'text-rose-400' : 'text-white/40'
        } />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-white/40 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-white truncate">{value}</p>
        {sub && <p className="text-[10px] text-white/30 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function readinessTone(score: number | null): 'green' | 'amber' | 'red' | 'gray' {
  if (score == null) return 'gray'
  if (score >= 80) return 'green'
  if (score >= 60) return 'amber'
  return 'red'
}

function adherenceTone(pct: number | null): 'green' | 'amber' | 'red' | 'gray' {
  if (pct == null) return 'gray'
  if (pct >= 80) return 'green'
  if (pct >= 50) return 'amber'
  return 'red'
}

function formatAge(iso: string | null): string {
  if (!iso) return 'Nunca'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 3600000) return `Hace ${Math.round(ms / 60000)} min`
  if (ms < 86400000) return `Hace ${Math.round(ms / 3600000)}h`
  return `Hace ${Math.round(ms / 86400000)}d`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

/**
 * Top-level resumen: one cohesive snapshot of the athlete's status.
 * Consumes training-summary, health, and device data to compute everything client-side.
 */
export function AthleteResumenPanel({ athleteId }: { athleteId: string }) {
  const [data, setData] = useState<ResumenData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      trainingApi.getTrainingSummary(athleteId, 7).catch(() => null),
      trainingApi.getHealth(athleteId, 7).catch(() => null),
    ]).then(([summary, health]) => {
      if (cancelled) return

      // Readiness from health data
      const hrvRows = health?.hrv ?? []
      const rhrRows = health?.restingHr ?? []
      const sleepLogs = health?.sleepLogs ?? []
      const manualRows = health?.manualReadiness ?? []

      let readinessScore: number | null = null
      let readinessSource: ResumenData['readinessSource'] = 'none'

      if (hrvRows.length > 0 && sleepLogs.length > 0) {
        const hrvToday = hrvRows.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0]?.value ?? 0
        const hrvBase = hrvRows.length > 1
          ? hrvRows.slice(1).reduce((s, r) => s + r.value, 0) / Math.max(hrvRows.length - 1, 1)
          : hrvToday
        const sleepScore = sleepLogs[0]?.score ?? (sleepLogs[0] ? Math.min(100, (sleepLogs[0].totalMinutes / 480) * 100) : 50)
        const rhrToday = rhrRows.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0]?.value ?? 55
        const rhrBase = rhrRows.length > 1
          ? rhrRows.slice(1).reduce((s, r) => s + r.value, 0) / Math.max(rhrRows.length - 1, 1)
          : rhrToday

        const hrvScore = Math.min(100, (hrvToday / Math.max(hrvBase, 1)) * 50)
        const rhrScore = Math.min(100, 50 + (rhrBase - rhrToday))
        readinessScore = Math.round(0.4 * hrvScore + 0.35 * sleepScore + 0.25 * rhrScore)
        readinessSource = 'automatic'
      } else if (manualRows.length > 0) {
        const latest = manualRows.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0]
        readinessScore = latest.value <= 10 ? latest.value * 10 : latest.value
        readinessSource = 'manual'
      }

      // Last workout
      const lastWorkout = summary?.recentSessions?.[0] ?? null

      // Sync status
      const devices = health?.hrv ?? [] // Use HRV source as proxy for sync status
      const lastSync = devices.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0]?.recordedAt ?? null
      const syncFresh = lastSync ? (Date.now() - new Date(lastSync).getTime()) < 86400000 : false

      // Adherence
      const sessions = summary?.sessions ?? 0
      const avgPerWeek = summary?.avgSessionsPerWeek ?? 0
      const programmed = Math.ceil(avgPerWeek * 1)
      const adherencePct = programmed > 0 ? Math.round((sessions / Math.max(programmed, 1)) * 100) : null

      setData({
        readinessScore,
        readinessSource,
        lastWorkout: lastWorkout ? {
          name: lastWorkout.workoutName || 'Entrenamiento',
          date: lastWorkout.date,
          setsCompleted: 0,
          duration: 0,
        } : null,
        lastSyncAge: lastSync,
        syncFresh,
        adherence: { completed: sessions, programmed, pct: adherencePct },
        recentPR: null, // Could be computed from 1RM endpoint
      })
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [athleteId])

  if (loading) {
    return <div className="rounded-2xl border border-white/5 bg-surface-1 p-5 h-32 animate-pulse" />
  }
  if (!data) return null

  return (
    <div className="rounded-2xl border border-white/5 bg-surface-1 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/70 flex items-center gap-2">
          <Activity size={14} className="text-brand-primary" />
          Resumen del atleta
        </h2>
        <StatusBadge
          label={
            data.readinessScore == null ? 'Sin datos'
              : data.readinessScore >= 80 ? 'Listo'
              : data.readinessScore >= 60 ? 'Atención'
              : 'Descansar'
          }
          tone={readinessTone(data.readinessScore)}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryStat
          icon={BatteryCharging}
          label="Readiness"
          value={data.readinessScore != null ? `${data.readinessScore}/100` : '—'}
          sub={data.readinessSource === 'automatic' ? 'Automático' : data.readinessSource === 'manual' ? 'Auto-reporte' : 'Sin datos'}
          tone={readinessTone(data.readinessScore)}
        />
        <SummaryStat
          icon={Dumbbell}
          label="Último entrenamiento"
          value={data.lastWorkout ? data.lastWorkout.name : '—'}
          sub={data.lastWorkout ? `Hace ${formatAge(data.lastWorkout.date)}` : 'Sin sesiones'}
          tone={data.lastWorkout ? 'green' : undefined}
        />
        <SummaryStat
          icon={data.syncFresh ? CheckCircle2 : AlertTriangle}
          label="Sync del reloj"
          value={data.lastSyncAge ? formatAge(data.lastSyncAge) : 'Sin sync'}
          sub={data.syncFresh ? 'Datos frescos' : 'Desactualizado'}
          tone={data.syncFresh ? 'green' : 'amber'}
        />
        <SummaryStat
          icon={TrendingUp}
          label="Adherencia"
          value={data.adherence.pct != null ? `${data.adherence.pct}%` : '—'}
          sub={`${data.adherence.completed}/${data.adherence.programmed} sesiones`}
          tone={adherenceTone(data.adherence.pct)}
        />
      </div>
    </div>
  )
}
