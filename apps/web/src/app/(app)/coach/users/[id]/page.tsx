'use client'

import { useParams } from 'next/navigation'
import { useAthletes } from '@/features/coach/hooks/useAthletes'
import { AthleteResumenPanel } from '@/features/coach/components/insights/AthleteResumenPanel'
import { AthleteTrainingPanels } from '@/features/coach/components/insights/AthleteTrainingPanels'
import { AthleteHealthPanels } from '@/features/coach/components/insights/AthleteHealthPanels'
import { useStreak, useBadges, usePRs } from '@/features/gamification/hooks/useGamification'
import { useWeeklyLeaderboard } from '@/features/leaderboard/hooks/useLeaderboard'
import { useCoachFeedPosts } from '@/features/coach-feed/hooks/useCoachFeed'
import { useAthleteFormMetrics } from '@/features/video-analytics/hooks/useFormMetrics'
import { ArrowLeft, Trophy, BarChart3, Activity, MessageSquare, TrendingUp, TrendingDown, Target } from 'lucide-react'
import Link from 'next/link'

export default function CoachUserDetailPage() {
  const params = useParams()
  const { getAthleteById } = useAthletes()
  const athlete = getAthleteById(params.id as string)

  const { data: streak } = useStreak()
  const { data: badges } = useBadges()
  const { data: prs } = usePRs()
  const { data: weeklyLeaderboard } = useWeeklyLeaderboard()
  const { data: formMetrics } = useAthleteFormMetrics(athlete?.id || '')
  const { data: coachFeedPosts } = useCoachFeedPosts()

  if (!athlete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <p className="text-lg font-semibold text-white">Atleta no encontrado</p>
        <Link href="/coach/users" className="text-sm text-brand-primary mt-2 hover:underline">
          Volver a usuarios
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <Link
        href="/coach/users"
        className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60"
      >
        <ArrowLeft size={14} />
        Volver a usuarios
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-primary/30 to-brand-primary/10 flex items-center justify-center text-lg font-bold text-brand-primary">
          {athlete.name.split(' ').map((n) => n[0]).join('')}
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-white">{athlete.name}</h1>
          <p className="text-sm text-white/40">{athlete.sport}</p>
        </div>
      </div>

      {/* Panel 1: Resumen dinámico (reemplaza el grid hardcodeado) */}
      <AthleteResumenPanel athleteId={athlete.id} />

      {/* Panel 2-4: Entrenamiento (progresión + fatiga + esfuerzo) */}
      <AthleteTrainingPanels athleteId={athlete.id} />

      {/* Panel 5-6: Salud del reloj (HRV/sueño/zones + videos) */}
      <AthleteHealthPanels athleteId={athlete.id} />

      {/* Gamificación */}
      <section className="bg-white/5 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
          <Trophy size={16} className="text-yellow-400" />
          Gamificación
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-brand-primary">{streak?.current_streak ?? 0}</p>
            <p className="text-xs text-white/40 mt-1">Racha actual</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-brand-primary">{streak?.longest_streak ?? 0}</p>
            <p className="text-xs text-white/40 mt-1">Mejor racha</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-brand-primary">{badges?.length ?? 0}</p>
            <p className="text-xs text-white/40 mt-1">Badges</p>
          </div>
        </div>
        {prs && prs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-white/40">Records Personales</p>
            {prs.slice(0, 5).map((pr) => (
              <div key={pr.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <span className="text-sm text-white">{pr.exercise_name}</span>
                <span className="text-sm font-mono text-brand-primary">{pr.value} {pr.unit}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Leaderboard */}
      {weeklyLeaderboard && weeklyLeaderboard.length > 0 && (
        <section className="bg-white/5 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-400" />
            Leaderboard Semanal
          </h2>
          <div className="space-y-2">
            {weeklyLeaderboard.slice(0, 10).map((entry, index) => (
              <div
                key={`${entry.athlete_id}-${entry.week_start}`}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                  entry.athlete_id === athlete.id ? 'bg-brand-primary/10 border border-brand-primary/20' : 'bg-white/5'
                }`}
              >
                <span className={`text-sm font-mono w-6 ${index === 0 ? 'text-yellow-400' : 'text-white/40'}`}>
                  {index + 1}
                </span>
                <span className="text-sm text-white flex-1">{entry.athlete_name}</span>
                <span className="text-sm font-mono text-brand-primary">{entry.points} pts</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Form Metrics */}
      {formMetrics && formMetrics.length > 0 && (
        <section className="bg-white/5 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
            <Target size={16} className="text-brand-primary" />
            Análisis de Forma
          </h2>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-brand-primary">
                {formMetrics.reduce((a, b) => a + b.sessions, 0)}
              </p>
              <p className="text-xs text-white/40 mt-1">Sesiones totales</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-brand-primary">
                {Math.round(formMetrics.reduce((a, b) => a + b.avg_score, 0) / formMetrics.length)}
              </p>
              <p className="text-xs text-white/40 mt-1">Promedio general</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-brand-primary">
                {formMetrics.filter(m => m.trend === 'improving').length}
              </p>
              <p className="text-xs text-white/40 mt-1">Mejorando</p>
            </div>
          </div>

          {/* Per-exercise breakdown */}
          <div className="space-y-3">
            <p className="text-xs text-white/40">Por Ejercicio</p>
            {formMetrics.map((ex) => (
              <div
                key={ex.exercise_id}
                className={`rounded-lg p-4 space-y-3 ${
                  ex.trend === 'declining'
                    ? 'bg-red-500/5 border border-red-500/20'
                    : 'bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{ex.exercise_name}</span>
                  <div className="flex items-center gap-2">
                    {ex.trend === 'improving' && <TrendingUp size={14} className="text-green-400" />}
                    {ex.trend === 'declining' && <TrendingDown size={14} className="text-red-400" />}
                    {ex.trend === 'stable' && <Activity size={14} className="text-gray-400" />}
                    <span className="text-xs text-white/40">{ex.sessions} sesiones</span>
                  </div>
                </div>

                {/* Score summary */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <p className="text-white/40">Último</p>
                    <p className="font-semibold text-white">{ex.latest_score}</p>
                  </div>
                  <div>
                    <p className="text-white/40">Promedio</p>
                    <p className="font-semibold text-brand-primary">{ex.avg_score}</p>
                  </div>
                  <div>
                    <p className="text-white/40">Mejor</p>
                    <p className="font-semibold text-green-400">{ex.best_score}</p>
                  </div>
                  <div>
                    <p className="text-white/40">Peor</p>
                    <p className="font-semibold text-red-400">{ex.worst_score}</p>
                  </div>
                </div>

                {/* Metric bars */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 w-16">Profundidad</span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full"
                        style={{ width: `${ex.avg_depth}%` }}
                      />
                    </div>
                    <span className="text-white w-6 text-right">{ex.avg_depth}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 w-16">Alineación</span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full"
                        style={{ width: `${ex.avg_alignment}%` }}
                      />
                    </div>
                    <span className="text-white w-6 text-right">{ex.avg_alignment}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 w-16">Tempo</span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${ex.avg_tempo}%` }}
                      />
                    </div>
                    <span className="text-white w-6 text-right">{ex.avg_tempo}</span>
                  </div>
                </div>

                {/* Alert for declining */}
                {ex.trend === 'declining' && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <TrendingDown size={12} className="text-amber-400" />
                    <span className="text-xs text-amber-400">Requiere atención — tendencia a la baja</span>
                  </div>
                )}

                {ex.trend === 'improving' && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                    <TrendingUp size={12} className="text-green-400" />
                    <span className="text-xs text-green-400">Mejorando — buen progreso</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Coach Feed */}
      {coachFeedPosts && coachFeedPosts.length > 0 && (
        <section className="bg-white/5 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
            <MessageSquare size={16} className="text-green-400" />
            Feed del Coach
          </h2>
          <div className="space-y-3">
            {coachFeedPosts.slice(0, 5).map((post) => (
              <div key={post.id} className="bg-white/5 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{post.coach_name}</span>
                  <span className="text-xs text-white/30">{new Date(post.created_at).toLocaleDateString('es-AR')}</span>
                </div>
                <p className="text-sm text-white/70">{post.content}</p>
                <div className="flex gap-4 text-xs text-white/40">
                  <span>❤️ {post.like_count}</span>
                  <span>💬 {post.comment_count}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
