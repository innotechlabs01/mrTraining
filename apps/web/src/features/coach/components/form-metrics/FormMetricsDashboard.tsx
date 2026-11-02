'use client'

/**
 * FormMetricsDashboard — Coach view of athlete form analysis metrics.
 * Shows trends, improvements, and areas for improvement per exercise.
 *
 * Data comes from form_metrics table (JSON synced from mobile).
 */
import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Target, Activity, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormMetricEntry {
  id: string
  athlete_id: string
  athlete_name: string
  exercise_id: string
  exercise_name: string
  form_score: number
  depth: number
  alignment: number
  tempo: number
  recorded_at: string
}

interface ExerciseStats {
  exerciseId: string
  exerciseName: string
  athleteId: string
  athleteName: string
  latestScore: number
  avgScore: number
  bestScore: number
  worstScore: number
  trend: 'improving' | 'declining' | 'stable'
  sessions: number
  avgDepth: number
  avgAlignment: number
  avgTempo: number
}

function ScoreBadge({ value }: { value: number }) {
  if (value >= 80) return <span className="text-green-400 font-semibold">{value}</span>
  if (value >= 60) return <span className="text-amber-400 font-semibold">{value}</span>
  return <span className="text-red-400 font-semibold">{value}</span>
}

function TrendIcon({ trend }: { trend: 'improving' | 'declining' | 'stable' }) {
  if (trend === 'improving') return <TrendingUp size={14} className="text-green-400" />
  if (trend === 'declining') return <TrendingDown size={14} className="text-red-400" />
  return <Activity size={14} className="text-gray-400" />
}

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#6B7280] w-16">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-white w-8 text-right">{Math.round(value)}</span>
    </div>
  )
}

export function FormMetricsDashboard() {
  const [stats, setStats] = useState<ExerciseStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/coach/form-metrics')
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        setStats(data)
      } catch (err) {
        console.error('Error loading form metrics:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Get unique athletes
  const athletes = Array.from(new Set(stats.map(s => s.athleteId))).map(id => {
    const s = stats.find(s => s.athleteId === id)
    return { id, name: s?.athleteName || 'Unknown' }
  })

  // Filter by selected athlete
  const filteredStats = selectedAthlete
    ? stats.filter(s => s.athleteId === selectedAthlete)
    : stats

  // Sort by trend (declining first — needs attention)
  const sortedStats = [...filteredStats].sort((a, b) => {
    if (a.trend === 'declining' && b.trend !== 'declining') return -1
    if (b.trend === 'declining' && a.trend !== 'declining') return 1
    return a.avgScore - b.avgScore
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
      </div>
    )
  }

  if (stats.length === 0) {
    return (
      <div className="text-center py-12">
        <Target size={48} className="text-[#6B7280] mx-auto mb-4" />
        <h3 className="text-white font-semibold mb-2">Sin datos de métricas</h3>
        <p className="text-[#9CA3AF] text-sm">
          Los atletas aún no han registrado métricas de forma.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Athlete filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedAthlete(null)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
            !selectedAthlete
              ? 'bg-brand-primary text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          )}
        >
          Todos ({athletes.length})
        </button>
        {athletes.map(a => (
          <button
            key={a.id}
            onClick={() => setSelectedAthlete(a.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
              selectedAthlete === a.id
                ? 'bg-brand-primary text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            )}
          >
            {a.name}
          </button>
        ))}
      </div>

      {/* Metrics grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedStats.map((s) => (
          <div
            key={`${s.athleteId}-${s.exerciseId}`}
            className={cn(
              'rounded-lg border p-4 space-y-3',
              s.trend === 'declining'
                ? 'bg-red-500/5 border-red-500/20'
                : 'bg-white/[0.02] border-white/5'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white">{s.exerciseName}</h4>
                <p className="text-xs text-[#6B7280]">{s.athleteName}</p>
              </div>
              <div className="flex items-center gap-2">
                <TrendIcon trend={s.trend} />
                <span className="text-xs text-[#6B7280]">{s.sessions} sesiones</span>
              </div>
            </div>

            {/* Score summary */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase">Mejor</p>
                <ScoreBadge value={s.bestScore} />
              </div>
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase">Promedio</p>
                <ScoreBadge value={s.avgScore} />
              </div>
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase">Peor</p>
                <ScoreBadge value={s.worstScore} />
              </div>
            </div>

            {/* Metric breakdown */}
            <div className="space-y-1.5">
              <MetricBar label="Profundidad" value={s.avgDepth} color="#34D399" />
              <MetricBar label="Alineación" value={s.avgAlignment} color="#3B9EFF" />
              <MetricBar label="Tempo" value={s.avgTempo} color="#FBBF24" />
            </div>

            {/* Improvement area */}
            {s.trend === 'declining' && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <AlertTriangle size={12} className="text-amber-400" />
                <span className="text-xs text-amber-400">Requiere atención — tendencia a la baja</span>
              </div>
            )}

            {s.trend === 'improving' && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                <CheckCircle size={12} className="text-green-400" />
                <span className="text-xs text-green-400">Mejorando — buen progreso</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
