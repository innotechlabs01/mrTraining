'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { MapPin, Timer, Gauge, Trophy, ChevronRight, Download, Calendar, ArrowUpRight, TrendingUp, CheckCircle2 } from 'lucide-react'
import { coachApi } from '@/features/shared/api/client'
import type { RunningSession, RunningStats, RunningPRsResponse, WeeklyTrendPoint, PastAssignmentListItem } from '@/features/shared/api/client'
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend
} from 'recharts'

interface AthleteRunningPanelProps {
  athleteId: string
}

export const AthleteRunningPanel = React.memo(function AthleteRunningPanel({ athleteId }: AthleteRunningPanelProps) {
  const [sessions, setSessions] = useState<RunningSession[]>([])
  const [assignedWorkouts, setAssignedWorkouts] = useState<PastAssignmentListItem[]>([])
  const [stats, setStats] = useState<RunningStats | null>(null)
  const [prs, setPrs] = useState<RunningPRsResponse | null>(null)
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({})
  const [exporting, setExporting] = useState(false)
  const [showAllSessions, setShowAllSessions] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [s, st, p, w, aw] = await Promise.all([
        coachApi.getAthleteRunningSessions(athleteId, {
          limit: 50,
          fromDate: dateRange.from,
          toDate: dateRange.to,
        }).catch(() => ({ data: [], total: 0, page: 1, limit: 50 })),
        coachApi.getAthleteRunningStats(athleteId, dateRange.from, dateRange.to).catch(() => null),
        coachApi.getAthleteRunningPRs(athleteId).catch(() => null),
        coachApi.getAthleteRunningWeeklyTrend(athleteId, dateRange.from, dateRange.to).catch(() => []),
        coachApi.getAthleteAssignedWorkouts(athleteId).catch(() => []),
      ])
      setSessions(s.data ?? [])
      setStats(st)
      setPrs(p)
      setWeeklyTrend(Array.isArray(w) ? w : [])
      setAssignedWorkouts(Array.isArray(aw) ? aw : [])
    } catch (e) {
      console.error('Failed to load running data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [athleteId, dateRange.from, dateRange.to])

  const exportData = async (format: 'csv' | 'gpx') => {
    setExporting(true)
    try {
      const blob = await coachApi.exportAthleteRunningSessions(athleteId, format, dateRange.from, dateRange.to)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `running-${athleteId}-${dateRange.from || 'all'}-to-${dateRange.to || 'now'}.${format}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setExporting(false)
    }
  }

  const formatPace = (pace: string) => pace || '–'
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }
  const formatTime = (seconds: number) => {
    if (!seconds || seconds === 0) return '–'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const weeklyData = useMemo(() => weeklyTrend.map(w => ({
    week: w.week,
    distancia: w.distance,
    sesiones: w.sessions,
    ritmo: w.avgPaceSec / 60, // min/km
    fc: w.avgHeartRate,
  })), [weeklyTrend])

  if (loading) {
    return (
      <section className="bg-white/5 rounded-xl p-5 space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 bg-white/10 rounded" />
          <div className="h-8 w-20 bg-white/10 rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white/10 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/10 rounded-lg" />)}
        </div>
        <div className="h-64 bg-white/10 rounded-lg" />
        <div className="space-y-2">
          <div className="h-6 bg-white/10 rounded w-1/4" />
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-white/10 rounded-lg" />)}
        </div>
      </section>
    )
  }

  const hasData = sessions.length > 0

  return (
    <section className="bg-white/5 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
          <MapPin size={16} className="text-green-400" />
          Running
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {!hasData && (
            <a
              href="/coach/workouts/builder"
              className="text-xs text-brand-primary hover:underline flex items-center gap-1 px-3 py-1.5 bg-brand-primary/10 rounded-lg"
            >
              <ArrowUpRight size={12} /> Asignar ruta de running
            </a>
          )}
          <div className="flex items-center gap-1 text-xs text-white/40">
            <Calendar size={12} />
            <input
              type="date"
              aria-label="Fecha desde"
              value={dateRange.from || ''}
              onChange={e => setDateRange(d => ({ ...d, from: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs"
            />
            <span>–</span>
            <input
              type="date"
              aria-label="Fecha hasta"
              value={dateRange.to || ''}
              onChange={e => setDateRange(d => ({ ...d, to: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => exportData('csv')}
            disabled={exporting || !hasData}
            className="flex items-center gap-1 text-xs text-white/60 hover:text-white px-3 py-1.5 bg-white/5 rounded-lg disabled:opacity-50"
            title="Exportar CSV"
          >
            <Download size={12} /> CSV
          </button>
          <button
            type="button"
            onClick={() => exportData('gpx')}
            disabled={exporting || !hasData}
            className="flex items-center gap-1 text-xs text-white/60 hover:text-white px-3 py-1.5 bg-white/5 rounded-lg disabled:opacity-50"
            title="Exportar GPX"
          >
            <Download size={12} /> GPX
          </button>
        </div>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<MapPin size={20} className="text-green-400" />}
            label="Sesiones"
            value={stats.totalSessions}
            trend={weeklyTrend.length > 1 ? weeklyTrend[weeklyTrend.length - 1].sessions - weeklyTrend[weeklyTrend.length - 2].sessions : 0}
          />
          <StatCard
            icon={<Gauge size={20} className="text-blue-400" />}
            label="Distancia"
            value={`${stats.totalDistance?.toFixed(1)} km`}
          />
          <StatCard
            icon={<Timer size={20} className="text-orange-400" />}
            label="Tiempo"
            value={formatDuration(stats.totalDuration || 0)}
          />
          <StatCard
            icon={<Gauge size={20} className="text-purple-400" />}
            label="Ritmo prom."
            value={formatPace(stats.avgPace || '')}
          />
        </div>
      )}

      {/* Weekly Trend Chart */}
      {weeklyData.length > 1 && (
        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-1">
            <TrendingUp size={12} className="text-green-400" />
            Tendencia semanal (últimas {weeklyData.length} semanas)
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={weeklyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDistance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#15AAF2" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#15AAF2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="week" stroke="#9CA3AF" fontSize={11} tick={{ fill: '#9CA3AF' }} />
              <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={11} tick={{ fill: '#9CA3AF' }} orientation="left" />
              <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={11} tick={{ fill: '#9CA3AF' }} domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1C2320', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value, name) => {
                  const num = typeof value === 'number' ? value : Number(Array.isArray(value) ? value[0] : (value ?? 0))
                  const label = String(name ?? '')
                  if (label === 'ritmo') return [`${Math.floor(num)}:${String(Math.round((num % 1) * 60)).padStart(2, '0')}`, label]
                  if (label === 'distancia') return [`${num.toFixed(1)} km`, label]
                  return [num, label]
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="distancia" yAxisId="left" stroke="#15AAF2" fillOpacity={1} fill="url(#colorDistance)" name="Distancia (km)" />
              <Line type="monotone" dataKey="ritmo" yAxisId="right" stroke="#F59E0B" strokeWidth={2} dot={false} name="Ritmo (min/km)" />
              <Line type="monotone" dataKey="fc" yAxisId="right" stroke="#EF4444" strokeWidth={2} dot={false} name="FC avg" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-400 rounded" /> Distancia</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-400 rounded" /> Ritmo</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded" /> FC</span>
          </div>
        </div>
      )}

      {/* PRs */}
      {prs && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <PRCard icon={<Trophy size={18} className="text-yellow-400" />} label="Mejor ritmo" value={formatPace(prs.bestPace)} />
          <PRCard icon={<MapPin size={18} className="text-green-400" />} label="Carrera más larga" value={`${prs.longestRun?.toFixed(1)} km`} />
          <PRCard icon={<Gauge size={18} className="text-blue-400" />} label="Total carreras" value={prs.totalRuns} />
          {prs.fastest1K > 0 && <PRCard icon={<Timer size={18} className="text-orange-400" />} label="Mejor 1K" value={formatTime(prs.fastest1K)} />}
          {prs.fastest5K > 0 && <PRCard icon={<Timer size={18} className="text-purple-400" />} label="Mejor 5K" value={formatTime(prs.fastest5K)} />}
          {prs.fastest10K > 0 && <PRCard icon={<Timer size={18} className="text-pink-400" />} label="Mejor 10K" value={formatTime(prs.fastest10K)} />}
        </div>
      )}

      {/* Assigned workouts for this athlete (prescribed vs actual + live SSE) */}
      {assignedWorkouts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
              Entrenamientos asignados (Ruta / Intervalos / En vivo)
            </h3>
            <a
              href="/coach/training/asignar"
              className="text-xs text-brand-primary hover:underline flex items-center gap-1"
            >
              Asignar nuevo <ChevronRight size={12} />
            </a>
          </div>
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {assignedWorkouts.map((aw) => (
              <li
                key={aw.id}
                className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <a
                  href={`/coach/users/${athleteId}/running/${aw.id}`}
                  className="flex items-center gap-3 flex-1"
                >
                  <CheckCircle2
                    size={16}
                    className={aw.status === 'completed' ? 'text-emerald-400' : 'text-blue-400'}
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{aw.contentName}</p>
                    <p className="text-xs text-white/50">
                      Progreso: {Math.round((aw.progress ?? 0) * 100)}% • Estado: {aw.status}
                    </p>
                  </div>
                </a>
                <a
                  href={`/coach/users/${athleteId}/running/${aw.id}`}
                  className="text-xs text-brand-primary hover:underline flex items-center gap-1"
                >
                  Ver detalle <ChevronRight size={12} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent sessions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Sesiones GPS registradas</h3>
          {sessions.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllSessions((v) => !v)}
              className="text-xs text-brand-primary hover:underline flex items-center gap-1"
            >
              {showAllSessions ? 'Ver menos' : `Ver todas (${sessions.length})`} <ChevronRight size={12} />
            </button>
          )}
        </div>
        {!hasData ? (
          <div className="text-center py-8 bg-white/5 rounded-lg">
            <MapPin size={32} className="mx-auto text-white/20 mb-2" />
            <p className="text-sm text-white/40">Sin sesiones de running</p>
            <p className="text-xs text-white/30 mt-1">Cuando el atleta complete carreras con GPS, aparecerán aquí</p>
            <a
              href="/coach/workouts/builder"
              className="mt-3 inline-flex items-center gap-1 text-xs text-brand-primary hover:underline"
            >
              <ArrowUpRight size={12} /> Crear workout con ruta de running
            </a>
          </div>
        ) : (
          <ul className="space-y-1 max-h-64 overflow-y-auto">
            {(showAllSessions ? sessions : sessions.slice(0, 5)).map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <a href={`/coach/users/${athleteId}/running/${s.id}`} className="flex items-center gap-3 flex-1">
                  <MapPin size={16} className="text-green-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{s.date}</p>
                      {(s.deviceName || s.source) && (
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white/60">
                          {s.deviceName || (s.source === 'apple_watch' ? 'Apple Watch' : s.source === 'garmin' ? 'Garmin' : s.source === 'health_connect' ? 'Health Connect' : s.source)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50">{s.distance?.toFixed(1)} km • {formatPace(s.pace)} • FC: {s.heartRate || '–'}{s.cadence ? ` • Cad: ${s.cadence} spm` : ''}</p>
                  </div>
                </a>
                <div className="text-right text-xs text-white/60">
                  <p>{formatDuration(s.duration || 0)}</p>
                  <p>{s.calories} kcal</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
})

function StatCard({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string | number; trend?: number }) {
  return (
    <div className="bg-white/5 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
        <span className="text-white/30">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-white mt-2">{value}</p>
      {trend !== undefined && trend !== 0 && (
        <p className={`text-xs mt-1 flex items-center gap-1 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
          <TrendingUp size={10} className={trend > 0 ? '' : 'rotate-180'} />
          {trend > 0 ? '+' : ''}{trend} vs semana anterior
        </p>
      )}
    </div>
  )
}

function PRCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-white/5 rounded-lg p-3">
      <p className="text-xs text-white/40 uppercase tracking-wider flex items-center gap-1">{icon} {label}</p>
      <p className="text-lg font-bold text-white mt-1">{value}</p>
    </div>
  )
}
