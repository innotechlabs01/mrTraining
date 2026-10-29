'use client'

import { useState, useEffect } from 'react'
import { MapPin, Timer, Gauge, Trophy, ChevronRight } from 'lucide-react'
import { goFetch } from '@/features/shared/api/client'
import type { RunningSession, RunningStats, RunningPRsResponse } from '@/features/shared/api/client'

interface AthleteRunningPanelProps {
  athleteId: string
}

export function AthleteRunningPanel({ athleteId }: AthleteRunningPanelProps) {
  const [sessions, setSessions] = useState<RunningSession[]>([])
  const [stats, setStats] = useState<RunningStats | null>(null)
  const [prs, setPrs] = useState<RunningPRsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({})

  const loadData = async () => {
    try {
      const [s, st, p] = await Promise.all([
        goFetch<{ data: RunningSession[] }>(`/api/v1/coach/athletes/${athleteId}/running/sessions?limit=10`),
        goFetch<RunningStats>(`/api/v1/coach/athletes/${athleteId}/running/stats`),
        goFetch<RunningPRsResponse>(`/api/v1/athlete/${athleteId}/analytics/running/prs`),
      ])
      setSessions(s.data)
      setStats(st)
      setPrs(p)
    } catch (e) {
      console.error('Failed to load running data:', e)
    } finally {
      setLoading(false)
    }
  }

  const dateKey = JSON.stringify(dateRange)

  useEffect(() => {
    loadData()
  }, [athleteId, dateKey])

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

  if (loading) {
    return (
      <section className="bg-white/5 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
          <MapPin size={16} className="text-green-400" />
          Running
        </h2>
        <div className="flex items-center justify-center h-32 text-white/40">Cargando running...</div>
      </section>
    )
  }

  return (
    <section className="bg-white/5 rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
        <MapPin size={16} className="text-green-400" />
        Running
      </h2>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/40 uppercase tracking-wider">Sesiones</p>
            <p className="text-2xl font-bold text-white">{stats.totalSessions}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/40 uppercase tracking-wider">Distancia</p>
            <p className="text-2xl font-bold text-white">{stats.totalDistance?.toFixed(1)} km</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/40 uppercase tracking-wider">Tiempo</p>
            <p className="text-2xl font-bold text-white">{formatDuration(stats.totalDuration || 0)}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/40 uppercase tracking-wider">Ritmo prom.</p>
            <p className="text-2xl font-bold text-white">{formatPace(stats.avgPace || '')}</p>
          </div>
        </div>
      )}

      {/* PRs */}
      {prs && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/40 uppercase tracking-wider">Mejor ritmo</p>
            <p className="text-lg font-bold text-white flex items-center gap-1">{formatPace(prs.bestPace)} <Trophy size={14} className="text-yellow-400" /></p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/40 uppercase tracking-wider">Carrera más larga</p>
            <p className="text-lg font-bold text-white">{prs.longestRun?.toFixed(1)} km</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/40 uppercase tracking-wider">Total carreras</p>
            <p className="text-lg font-bold text-white">{prs.totalRuns}</p>
          </div>
          {prs.fastest5K && (
            <div className="bg-white/5 rounded-lg p-3 col-span-2">
              <p className="text-xs text-white/40 uppercase tracking-wider">Mejor 5K</p>
              <p className="text-lg font-bold text-white">{formatTime(prs.fastest5K)}</p>
            </div>
          )}
          {prs.fastest10K && (
            <div className="bg-white/5 rounded-lg p-3 col-span-2">
              <p className="text-xs text-white/40 uppercase tracking-wider">Mejor 10K</p>
              <p className="text-lg font-bold text-white">{formatTime(prs.fastest10K)}</p>
            </div>
          )}
        </div>
      )}

      {/* Recent sessions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Sesiones recientes</h3>
          <a
            href={`/coach/athletes/${athleteId}/running`}
            className="text-xs text-brand-primary hover:underline flex items-center gap-1"
          >
            Ver todas <ChevronRight size={12} />
          </a>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-4">Sin sesiones de running</p>
        ) : (
          <ul className="space-y-1">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <a href={`/coach/users/${athleteId}/running/${s.id}`} className="flex items-center gap-3 flex-1">
                  <MapPin size={16} className="text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-white">{s.date}</p>
                    <p className="text-xs text-white/50">{s.distance?.toFixed(1)} km • {formatPace(s.pace)} • FC: {s.heartRate || '–'}</p>
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
}