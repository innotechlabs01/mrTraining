'use client'

/**
 * VideoAnalyticsDashboard — Coach view of athlete video engagement.
 * Shows best/worst performance per exercise per athlete.
 */
import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Eye, Pause, RefreshCw, Play, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AthleteVideoMetric {
  athlete_id: string
  athlete_name: string
  exercise_id: string
  exercise_name: string
  best_completion: number
  worst_completion: number
  avg_completion: number
  avg_pauses: number
  avg_replays: number
  avg_watch_time: number
  total_views: number
}

function CompletionBadge({ value }: { value: number }) {
  if (value >= 80) return <span className="text-green-400 font-semibold">{value}%</span>
  if (value >= 50) return <span className="text-amber-400 font-semibold">{value}%</span>
  return <span className="text-red-400 font-semibold">{value}%</span>
}

function MetricRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon size={14} className="text-[#6B7280]" />
      <span className="text-[#6B7280]">{label}</span>
      <span className="text-white font-medium ml-auto">{value}</span>
    </div>
  )
}

export function VideoAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<AthleteVideoMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/coach/video-analytics')
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        setMetrics(data)
      } catch (err) {
        console.error('Error loading video analytics:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Group by athlete
  const athletes = Array.from(new Set(metrics.map(m => m.athlete_id))).map(id => {
    const athleteMetrics = metrics.filter(m => m.athlete_id === id)
    const name = athleteMetrics[0]?.athlete_name || 'Unknown'
    return { id, name, metrics: athleteMetrics }
  })

  // Filter by selected athlete
  const filteredMetrics = selectedAthlete
    ? metrics.filter(m => m.athlete_id === selectedAthlete)
    : metrics

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
      </div>
    )
  }

  if (metrics.length === 0) {
    return (
      <div className="text-center py-12">
        <Eye size={48} className="text-[#6B7280] mx-auto mb-4" />
        <h3 className="text-white font-semibold mb-2">Sin datos de video</h3>
        <p className="text-[#9CA3AF] text-sm">
          Los atletas aún no han visto ni grabado videos de ejercicios.
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
            {a.name} ({a.metrics.length})
          </button>
        ))}
      </div>

      {/* Metrics grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMetrics.map((m, idx) => (
          <div
            key={`${m.athlete_id}-${m.exercise_id}-${idx}`}
            className="rounded-lg bg-white/[0.02] border border-white/5 p-4 space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white">{m.exercise_name}</h4>
                <p className="text-xs text-[#6B7280]">{m.athlete_name}</p>
              </div>
              <span className="text-xs text-[#6B7280]">{m.total_views} vistas</span>
            </div>

            {/* Best/Worst */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-green-500/5 border border-green-500/10 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={12} className="text-green-400" />
                  <span className="text-[10px] text-green-400 uppercase tracking-wider">Mejor</span>
                </div>
                <CompletionBadge value={Math.round(m.best_completion)} />
              </div>
              <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown size={12} className="text-red-400" />
                  <span className="text-[10px] text-red-400 uppercase tracking-wider">Peor</span>
                </div>
                <CompletionBadge value={Math.round(m.worst_completion)} />
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
              <MetricRow icon={Play} label="Promedio" value={`${Math.round(m.avg_completion)}%`} />
              <MetricRow icon={Pause} label="Pausas" value={Math.round(m.avg_pauses)} />
              <MetricRow icon={RefreshCw} label="Replays" value={Math.round(m.avg_replays)} />
              <MetricRow icon={Eye} label="Tiempo" value={`${Math.round(m.avg_watch_time)}s`} />
            </div>

            {/* Alert if worst is low */}
            {m.worst_completion < 30 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <AlertTriangle size={12} className="text-amber-400" />
                <span className="text-xs text-amber-400">Requiere atención</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
