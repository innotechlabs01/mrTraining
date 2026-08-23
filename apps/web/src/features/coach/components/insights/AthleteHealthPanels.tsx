'use client'

import { useEffect, useState } from 'react'
import { HeartPulse, Moon, Watch } from 'lucide-react'
import {
  trainingApi,
  type AthleteHealthResponse,
  type HealthSeriesRow,
} from '@/features/shared/api/client'
import type { LucideIcon } from 'lucide-react'

const SOURCE_LABEL: Record<string, string> = {
  healthkit: 'Apple Health',
  healthconnect: 'Health Connect',
  garmin: 'Garmin',
  manual: 'Auto-reporte',
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-surface-1 p-5 space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white/70">
        <Icon size={15} className="text-brand-primary" />
        {title}
      </h2>
      {children}
    </div>
  )
}

function latestVsBaseline(rows: HealthSeriesRow[]): { latest: number; deltaPct: number | null } | null {
  if (rows.length === 0) return null
  const sorted = [...rows].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
  const latest = sorted[0].value
  // Baseline = mean of distinct prior days within the window (mirrors the mobile formula).
  const todayKey = sorted[0].recordedAt.slice(0, 10)
  const byDay = new Map<string, number[]>()
  for (const r of sorted) {
    const key = r.recordedAt.slice(0, 10)
    if (key === todayKey) continue
    byDay.set(key, [...(byDay.get(key) ?? []), r.value])
  }
  if (byDay.size === 0) return { latest, deltaPct: null }
  const dayAvgs = [...byDay.values()].map(vs => vs.reduce((a, b) => a + b, 0) / vs.length)
  const baseline = dayAvgs.reduce((a, b) => a + b, 0) / dayAvgs.length
  return { latest, deltaPct: baseline > 0 ? Math.round(((latest - baseline) / baseline) * 100) : null }
}

function MetricHero({ rows, unit, label }: { rows: HealthSeriesRow[]; unit: string; label: string }) {
  const stat = latestVsBaseline(rows)
  return (
    <div>
      <p className="text-2xl font-bold text-white font-display">
        {stat ? Math.round(stat.latest) : '—'}
        <span className="text-xs text-white/40 ml-1">{unit}</span>
      </p>
      <p className="text-xs text-white/40">{label}</p>
      {stat?.deltaPct != null && (
        <p className={`text-xs mt-0.5 ${stat.deltaPct >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
          {stat.deltaPct >= 0 ? '+' : ''}{stat.deltaPct}% vs base
        </p>
      )}
    </div>
  )
}

function SleepBars({ nights }: { nights: AthleteHealthResponse['sleepLogs'] }) {
  const ordered = [...nights].sort((a, b) => a.date.localeCompare(b.date)).slice(-7)
  if (ordered.length === 0) return null
  const maxH = Math.max(8, ...ordered.map(n => n.totalMinutes / 60))
  return (
    <div className="flex items-end gap-2">
      {ordered.map((n) => {
        const h = n.totalMinutes / 60
        const pct = Math.round((Math.min(h, maxH) / maxH) * 100)
        return (
          <div key={n.date} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-[10px] text-white/40">{h.toFixed(1)}</span>
            <div className="w-full h-16 rounded bg-white/5 overflow-hidden flex flex-col justify-end">
              <div className="w-full bg-brand-primary/70 rounded" style={{ height: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-white/30">{n.date.slice(8)}</span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Wearable-derived health panels for one athlete. Every number is measured by the
 * athlete's watch or entered manually by them — the coach reads reality, not estimates.
 */
export function AthleteHealthPanels({ athleteId }: { athleteId: string }) {
  const [health, setHealth] = useState<AthleteHealthResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    trainingApi.getHealth(athleteId)
      .then(data => { if (!cancelled) setHealth(data) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Error') })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [athleteId])

  if (isLoading) {
    return <div className="rounded-2xl border border-white/5 bg-surface-1 p-5 h-28 animate-pulse" />
  }
  if (error || !health) return null

  const hasAny =
    health.hrv.length > 0 ||
    health.restingHr.length > 0 ||
    health.sleepLogs.length > 0 ||
    health.manualReadiness.length > 0

  if (!hasAny) return null

  const sources = [
    ...new Set([
      ...health.hrv.map(r => r.source),
      ...health.restingHr.map(r => r.source),
      ...health.sleepLogs.map(r => r.source),
    ]),
  ]

  return (
    <div className="space-y-4">
      <Panel title={`Salud · últimos ${health.windowDays} días`} icon={Watch}>
        <div className="grid grid-cols-3 gap-3">
          <MetricHero rows={health.hrv} unit="ms" label="HRV" />
          <MetricHero rows={health.restingHr} unit="bpm" label="Pulso reposo" />
          <MetricHero rows={health.manualReadiness} unit="/100" label="Auto-reporte" />
        </div>
        {sources.length > 0 && (
          <p className="text-xs text-white/30 pt-2 border-t border-white/5">
            Fuente: {sources.map(s => SOURCE_LABEL[s] ?? s).join(', ')}
          </p>
        )}
      </Panel>

      {health.sleepLogs.length > 0 && (
        <Panel title="Sueño por noche" icon={Moon}>
          <SleepBars nights={health.sleepLogs} />
          <ul className="space-y-1 pt-2 border-t border-white/5">
            {([...health.sleepLogs]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 3))
              .map(n => (
                <li key={n.date} className="flex justify-between text-xs">
                  <span className="text-white/60">{n.date}</span>
                  <span className="text-white/40">
                    {(n.totalMinutes / 60).toFixed(1)}h
                    {n.deepMinutes ? ` · Deep ${Math.round(n.deepMinutes / 60 * 10) / 10}h` : ''}
                    {n.remMinutes ? ` · REM ${Math.round(n.remMinutes / 60 * 10) / 10}h` : ''}
                  </span>
                </li>
              ))}
          </ul>
        </Panel>
      )}

      {health.hrv.length > 0 && (
        <Panel title="HRV reciente" icon={HeartPulse}>
          <ul className="space-y-1">
            {[...health.hrv]
              .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
              .slice(0, 5)
              .map(r => (
                <li key={r.recordedAt} className="flex justify-between text-xs">
                  <span className="text-white/60">{r.recordedAt.slice(0, 10)}</span>
                  <span className="text-white font-display">{Math.round(r.value)} ms</span>
                </li>
              ))}
          </ul>
        </Panel>
      )}

      <HRZonesPanel athleteId={athleteId} />
      <VideoEngagementPanel athleteId={athleteId} />
    </div>
  )
}

const ZONE_COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];
const ZONE_LABELS = ['Zona 1 · Recuperación', 'Zona 2 · Aeróbica', 'Zona 3 · Tempo', 'Zona 4 · Umbral', 'Zona 5 · VO₂max'];

function HRZonesPanel({ athleteId }: { athleteId: string }) {
  const [zones, setZones] = useState<{ zone1: number; zone2: number; zone3: number; zone4: number; zone5: number; totalTime: number; avgBpm: number | null; maxBpm: number | null } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    trainingApi.getHrZones(athleteId)
      .then(data => { if (!cancelled) setZones(data.hrZones) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [athleteId])

  if (loading) return <div className="rounded-2xl border border-white/5 bg-surface-1 p-5 h-20 animate-pulse" />
  if (!zones || zones.totalTime === 0) return null

  const total = zones.totalTime
  const vals = [zones.zone1, zones.zone2, zones.zone3, zones.zone4, zones.zone5]
  const maxZone = Math.max(...vals)

  return (
    <Panel title="Zonas de frecuencia cardíaca" icon={HeartPulse}>
      <div className="space-y-1.5">
        {vals.map((sec, i) => {
          const pct = total > 0 ? Math.round((sec / total) * 100) : 0
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-white/50 w-20 truncate">{ZONE_LABELS[i]}</span>
              <div className="flex-1 h-2 rounded bg-white/5 overflow-hidden">
                <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: ZONE_COLORS[i] }} />
              </div>
              <span className="text-[10px] text-white/40 w-8 text-right">{pct}%</span>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-white/30 pt-2 border-t border-white/5 mt-2">
        <span>{Math.round(total / 60)} min totales</span>
        {zones.avgBpm && <span>Promedio: {Math.round(zones.avgBpm)} bpm</span>}
        {zones.maxBpm && <span>Máximo: {zones.maxBpm} bpm</span>}
      </div>
    </Panel>
  )
}

function VideoEngagementPanel({ athleteId }: { athleteId: string }) {
  const [analytics, setAnalytics] = useState<Array<{ exerciseName: string; totalViews: number; completedViews: number; completionRate: number | null }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    trainingApi.getVideoAnalytics()
      .then(data => {
        if (!cancelled) {
          // Show top exercises by views (filter to those with views).
          setAnalytics((data.analytics ?? []).filter(a => a.totalViews > 0).slice(0, 5))
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [athleteId])

  if (loading) return <div className="rounded-2xl border border-white/5 bg-surface-1 p-5 h-20 animate-pulse" />
  if (analytics.length === 0) return null

  return (
    <Panel title="Videos de ejercicios" icon={Watch}>
      <ul className="space-y-1.5">
        {analytics.map(a => (
          <li key={a.exerciseName} className="flex items-center justify-between text-xs">
            <span className="text-white/60 truncate pr-2">{a.exerciseName}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-white/40">{a.totalViews} vistas</span>
              {a.completionRate != null && (
                <span className={`font-display ${a.completionRate >= 80 ? 'text-emerald-400' : a.completionRate >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {a.completionRate}%
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
