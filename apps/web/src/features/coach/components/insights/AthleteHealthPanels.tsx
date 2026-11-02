'use client'

import { useEffect, useState, useMemo } from 'react'
import { HeartPulse, Moon, Watch, Activity, Zap, Droplets, Brain, Flame, ChevronRight } from 'lucide-react'
import {
  trainingApi,
  type AthleteHealthResponse,
  type HealthSeriesRow,
  type HealthDevice,
} from '@/features/shared/api/client'
import type { LucideIcon } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, Cell, Legend
} from 'recharts'

const SOURCE_LABEL: Record<string, string> = {
  healthkit: 'Apple Health',
  healthconnect: 'Health Connect',
  garmin: 'Garmin',
  manual: 'Auto-reporte',
}

const METRIC_ICONS: Record<string, LucideIcon> = {
  hrv: HeartPulse,
  resting_hr: HeartPulse,
  steps: Activity,
  active_calories: Flame,
  vo2max: Brain,
  readiness: Zap,
  manual_readiness: Zap,
  rhr: HeartPulse,
}

const METRIC_COLORS: Record<string, string> = {
  hrv: '#22c55e',
  resting_hr: '#ef4444',
  steps: '#3b82f6',
  active_calories: '#f97316',
  vo2max: '#a855f7',
  readiness: '#eab308',
  manual_readiness: '#eab308',
  rhr: '#ef4444',
}

const METRIC_LABELS: Record<string, { label: string; unit: string; color: string }> = {
  hrv: { label: 'HRV', unit: 'ms', color: '#22c55e' },
  resting_hr: { label: 'Pulso reposo', unit: 'bpm', color: '#ef4444' },
  rhr: { label: 'Pulso reposo', unit: 'bpm', color: '#ef4444' },
  steps: { label: 'Pasos', unit: 'pasos', color: '#3b82f6' },
  active_calories: { label: 'Cal. activas', unit: 'kcal', color: '#f97316' },
  vo2max: { label: 'VO₂max', unit: 'ml/kg/min', color: '#a855f7' },
  readiness: { label: 'Readiness', unit: '/100', color: '#eab308' },
  manual_readiness: { label: 'Auto-reporte', unit: '/100', color: '#eab308' },
}

function Panel({ title, icon: Icon, children, action }: { title: string; icon: LucideIcon; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-surface-1 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white/70">
          <Icon size={15} className="text-brand-primary" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function latestVsBaseline(rows: HealthSeriesRow[]): { latest: number; deltaPct: number | null; trend: 'up' | 'down' | 'stable' } | null {
  if (rows.length === 0) return null
  const sorted = [...rows].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
  const latest = sorted[0].value
  const todayKey = sorted[0].recordedAt.slice(0, 10)
  const byDay = new Map<string, number[]>()
  for (const r of sorted) {
    const key = r.recordedAt.slice(0, 10)
    if (key === todayKey) continue
    byDay.set(key, [...(byDay.get(key) ?? []), r.value])
  }
  if (byDay.size === 0) return { latest, deltaPct: null, trend: 'stable' }
  const dayAvgs = [...byDay.values()].map(vs => vs.reduce((a, b) => a + b, 0) / vs.length)
  const baseline = dayAvgs.reduce((a, b) => a + b, 0) / dayAvgs.length
  const deltaPct = baseline > 0 ? Math.round(((latest - baseline) / baseline) * 100) : null
  const trend = deltaPct === null ? 'stable' : deltaPct > 2 ? 'up' : deltaPct < -2 ? 'down' : 'stable'
  return { latest, deltaPct, trend }
}

function MetricHero({ rows, metricType }: { rows: HealthSeriesRow[]; metricType: string }) {
  const info = METRIC_LABELS[metricType] || { label: metricType, unit: '', color: '#6b7280' }
  const stat = latestVsBaseline(rows)
  const Icon = METRIC_ICONS[metricType] || HeartPulse

  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <Icon size={14} className={`text-white/60`} style={{ color: info.color }} />
        <p className="text-xs text-white/40 uppercase tracking-wider">{info.label}</p>
      </div>
      <p className="text-2xl font-bold text-white font-display" style={{ color: info.color }}>
        {stat ? Math.round(stat.latest) : '—'}
        <span className="text-xs text-white/40 ml-1">{info.unit}</span>
      </p>
      {stat?.deltaPct != null && (
        <p className={`text-xs mt-0.5 ${stat.deltaPct >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
          {stat.trend === 'up' ? '↑ ' : stat.trend === 'down' ? '↓ ' : ''}
          {stat.deltaPct >= 0 ? '+' : ''}{stat.deltaPct}% vs base
        </p>
      )}
    </div>
  )
}

function TrendChart({ data, metricType, height = 120 }: { data: HealthSeriesRow[]; metricType: string; height?: number }) {
  if (data.length < 2) return null

  const info = METRIC_LABELS[metricType] || { label: metricType, unit: '', color: '#6b7280' }
  const color = info.color

  // Aggregate by day
  const byDay = new Map<string, number[]>()
  for (const r of data) {
    const key = r.recordedAt.slice(0, 10)
    byDay.set(key, [...(byDay.get(key) ?? []), r.value])
  }
  const daily = [...byDay.entries()]
    .map(([date, values]) => ({ date, value: values.reduce((a, b) => a + b, 0) / values.length }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)

  if (daily.length < 2) return null

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={daily} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`color-${metricType}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} tickFormatter={d => d.slice(5)} />
        <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1C2320', border: '1px solid #374151', borderRadius: 8 }}
          labelStyle={{ color: '#fff' }}
          itemStyle={{ color: '#fff' }}
          formatter={(value: any, name?: string | number) => [typeof value === 'number' ? Math.round(value) : value, String(name ?? '')]}
        />
        <Area type="monotone" dataKey="value" stroke={color} fillOpacity={1} fill={`url(#color-${metricType})`} />
      </AreaChart>
    </ResponsiveContainer>
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
            <span className="text-[10px] text-white/40">{h.toFixed(1)}h</span>
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

function SleepQualityChart({ nights }: { nights: AthleteHealthResponse['sleepLogs'] }) {
  const ordered = [...nights].sort((a, b) => a.date.localeCompare(b.date)).slice(-14)
  if (ordered.length === 0) return null

  const data = ordered.map(n => ({
    date: n.date.slice(5),
    efficiency: n.efficiency ? Math.round(n.efficiency) : 0,
    deep: n.deepMinutes ? Math.round(n.deepMinutes / 60 * 10) / 10 : 0,
    rem: n.remMinutes ? Math.round(n.remMinutes / 60 * 10) / 10 : 0,
    light: n.lightMinutes ? Math.round(n.lightMinutes / 60 * 10) / 10 : 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} />
        <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1C2320', border: '1px solid #374151', borderRadius: 8 }}
          labelStyle={{ color: '#fff' }}
          itemStyle={{ color: '#fff' }}
          formatter={(value: any, name?: string | number) => {
            const labels: Record<string, string> = {
              efficiency: 'Eficiencia (%)',
              deep: 'Deep (h)',
              rem: 'REM (h)',
              light: 'Light (h)',
            }
            const num = typeof value === 'number' ? value : 0
            const label = typeof name === 'string' ? (labels[name] || name) : ''
            return [num, label] as const
          }}
        />
        <Legend />
        <Bar dataKey="efficiency" fill="#22c55e" name="Eficiencia %" radius={[4, 4, 0, 0]} />
        <Bar dataKey="deep" fill="#3b82f6" name="Deep (h)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="rem" fill="#a855f7" name="REM (h)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="light" fill="#9CA3AF" name="Light (h)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function DeviceStatusPanel({ devices }: { devices: HealthDevice[] }) {
  if (!devices.length) return null

  return (
    <Panel title="Dispositivos conectados" icon={Watch}>
      <ul className="space-y-3">
        {devices.map(d => (
          <li key={d.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-primary/20 flex items-center justify-center">
                <Watch size={20} className="text-brand-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-white capitalize">{d.platform === 'healthkit' ? 'Apple Watch' : d.platform === 'healthconnect' ? 'Health Connect' : d.platform}</p>
                <p className="text-xs text-white/40">{d.deviceName || d.deviceBrand || 'Dispositivo desconocido'}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${d.isActive ? 'bg-emerald-400/20 text-emerald-400' : 'bg-rose-400/20 text-rose-400'}`}>
                {d.isActive ? '● Activo' : '○ Inactivo'}
              </span>
              {d.lastSyncAt && (
                <p className="text-[10px] text-white/30 mt-1">Último sync: {new Date(d.lastSyncAt).toLocaleString()}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function MetricTrendPanel({ data, metricType, title }: { data: HealthSeriesRow[]; metricType: string; title: string }) {
  const info = METRIC_LABELS[metricType] || { label: metricType, unit: '', color: '#6b7280' }
  const stat = latestVsBaseline(data)
  const Icon = METRIC_ICONS[metricType] || HeartPulse

  return (
    <Panel title={title} icon={Icon} action={
      stat?.deltaPct != null && (
        <span className={`text-xs ${stat.deltaPct >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
          {stat.trend === 'up' ? '↑ ' : stat.trend === 'down' ? '↓ ' : ''}{stat.deltaPct >= 0 ? '+' : ''}{stat.deltaPct}% vs base
        </span>
      )
    }>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <MetricHero rows={data} metricType={metricType} />
        </div>
        <div>
          <TrendChart data={data} metricType={metricType} height={100} />
        </div>
      </div>
    </Panel>
  )
}

function SleepQualityPanel({ sleepLogs }: { sleepLogs: AthleteHealthResponse['sleepLogs'] }) {
  if (!sleepLogs.length) return null

  const latest = [...sleepLogs].sort((a, b) => b.date.localeCompare(a.date))[0]
  const avgEfficiency = sleepLogs.filter(s => s.efficiency).reduce((a, b) => a + (b.efficiency || 0), 0) / sleepLogs.filter(s => s.efficiency).length || 0

  return (
    <Panel title="Calidad del sueño" icon={Moon}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-white font-display">{latest.totalMinutes / 60 > 0 ? (latest.totalMinutes / 60).toFixed(1) : '—'}</p>
          <p className="text-xs text-white/40">Total h</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-white font-display">{Math.round(avgEfficiency)}%</p>
          <p className="text-xs text-white/40">Eficiencia prom.</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-white font-display">{latest.deepMinutes ? (latest.deepMinutes / 60).toFixed(1) : '—'}</p>
          <p className="text-xs text-white/40">Deep h</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-white font-display">{latest.remMinutes ? (latest.remMinutes / 60).toFixed(1) : '—'}</p>
          <p className="text-xs text-white/40">REM h</p>
        </div>
      </div>
      <SleepQualityChart nights={sleepLogs} />
    </Panel>
  )
}

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
    return <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="rounded-2xl border border-white/5 bg-surface-1 p-5 h-28 animate-pulse" />)}</div>
  }
  if (error || !health) return null

  const hasAny =
    health.hrv.length > 0 ||
    health.restingHr.length > 0 ||
    health.sleepLogs.length > 0 ||
    health.manualReadiness.length > 0 ||
    health.steps.length > 0 ||
    health.activeCalories.length > 0 ||
    health.vo2max.length > 0

  if (!hasAny) return null

  const sources = [
    ...new Set([
      ...health.hrv.map(r => r.source),
      ...health.restingHr.map(r => r.source),
      ...health.sleepLogs.map(r => r.source),
      ...health.steps.map(r => r.source),
      ...health.activeCalories.map(r => r.source),
      ...health.vo2max.map(r => r.source),
    ]),
  ].filter((s): s is string => typeof s === 'string')

  return (
    <div className="space-y-4">
      {/* Device Status */}
      <DeviceStatusPanel devices={health.devices} />

      {/* Core Recovery Metrics */}
      <Panel title={`Recuperación · últimos ${health.windowDays} días`} icon={HeartPulse}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {health.hrv.length > 0 && <MetricHero rows={health.hrv} metricType="hrv" />}
          {health.restingHr.length > 0 && <MetricHero rows={health.restingHr} metricType="resting_hr" />}
          {health.manualReadiness.length > 0 && <MetricHero rows={health.manualReadiness} metricType="manual_readiness" />}
          {health.vo2max.length > 0 && <MetricHero rows={health.vo2max} metricType="vo2max" />}
        </div>
        {sources.length > 0 && (
          <p className="text-xs text-white/30 pt-2 border-t border-white/5">
            Fuente: {[...sources].map(s => SOURCE_LABEL[s] ?? s).join(', ')}
          </p>
        )}
      </Panel>

      {/* Trend Charts for Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {health.hrv.length > 0 && <MetricTrendPanel data={health.hrv} metricType="hrv" title="HRV Trend (14d)" />}
        {health.restingHr.length > 0 && <MetricTrendPanel data={health.restingHr} metricType="resting_hr" title="Pulso Reposo Trend (14d)" />}
        {health.vo2max.length > 0 && <MetricTrendPanel data={health.vo2max} metricType="vo2max" title="VO₂max Trend (14d)" />}
        {health.steps.length > 0 && <MetricTrendPanel data={health.steps} metricType="steps" title="Pasos Diarios Trend (14d)" />}
        {health.activeCalories.length > 0 && <MetricTrendPanel data={health.activeCalories} metricType="active_calories" title="Cal. Activas Trend (14d)" />}
      </div>

      {/* Sleep */}
      {health.sleepLogs.length > 0 && (
        <>
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
          <SleepQualityPanel sleepLogs={health.sleepLogs} />
        </>
      )}

      {/* HRV History Detail */}
      {health.hrv.length > 0 && (
        <Panel title="HRV reciente (detalle)" icon={HeartPulse}>
          <ul className="space-y-1">
            {[...health.hrv]
              .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
              .slice(0, 7)
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

  return (
    <Panel title="Zonas de frecuencia cardíaca (entrenos)" icon={HeartPulse}>
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