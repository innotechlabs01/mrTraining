'use client'

import { useParams } from 'next/navigation'
import { useAthletes } from '@/features/coach/hooks/useAthletes'
import { AthleteResumenPanel } from '@/features/coach/components/insights/AthleteResumenPanel'
import { AthleteTrainingPanels } from '@/features/coach/components/insights/AthleteTrainingPanels'
import { AthleteHealthPanels } from '@/features/coach/components/insights/AthleteHealthPanels'
import { AthleteRunningPanel } from '@/features/coach/components/insights/AthleteRunningPanel'
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

  const { data: streak } = useStreak(athlete.id)
  const { data: badges } = useBadges(athlete.id)
  const { data: prs } = usePRs(athlete.id)
  const { data: weeklyLeaderboard } = useWeeklyLeaderboard()
  const { data: formMetrics } = useAthleteFormMetrics(athlete.id)
  const { data: coachFeedPosts } = useCoachFeedPosts()

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

      {/* Running Panel */}
      <AthleteRunningPanel athleteId={athlete.id} />

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
            <p className="text-xs text-white/40 mt-1">Racha máxima</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-brand-primary">{badges?.length ?? 0}</p>
            <p className="text-xs text-white/40 mt-1">Badges</p>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">PRs Recientes</h3>
          {(prs?.length ?? 0) > 0 ? (
            <ul className="space-y-1">
              {prs!.slice(0, 5).map((pr, i) => (
                <li key={i} className="text-sm text-white/70 flex justify-between">
                  <span>{pr.exercise_name || pr.exercise_id}</span>
                  <span className="font-mono text-brand-primary">{pr.value} {pr.unit}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-white/40">Sin PRs registrados</p>
          )}
        </div>
      </section>

      {/* Leaderboard semanal */}
      <section className="bg-white/5 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
          <Target size={16} className="text-brand-primary" />
          Leaderboard Semanal
        </h2>
        {(weeklyLeaderboard?.length ?? 0) > 0 ? (
          <ol className="space-y-2">
            {weeklyLeaderboard!.map((entry, i) => (
              <li key={entry.athlete_id} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-center text-white/40 font-bold">{i + 1}.</span>
                <span className="flex-1 text-white">{entry.athlete_name}</span>
                <span className="text-brand-primary font-mono">{entry.points} pts</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-white/40">Sin datos de leaderboard</p>
        )}
      </section>

      {/* Form metrics */}
      <section className="bg-white/5 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
          <MessageSquare size={16} className="text-green-400" />
          Métricas de Forma
        </h2>
        {(formMetrics?.length ?? 0) > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {formMetrics!.map((fm, i) => (
              <div key={i} className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-white/40 uppercase tracking-wider">{fm.exercise_name}</p>
                <p className="text-lg font-bold text-white mt-1">{fm.latest_score}</p>
                <p className="text-xs text-white/40 mt-1">Mejor: {fm.best_score} • Promedio: {fm.avg_score}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40">Sin métricas de forma</p>
        )}
      </section>

      {/* Coach Feed */}
      <section className="bg-white/5 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
          <Activity size={16} className="text-purple-400" />
          Feed del Coach
        </h2>
        {(coachFeedPosts?.length ?? 0) > 0 ? (
          <ul className="space-y-3">
            {coachFeedPosts!.map((post) => (
              <li key={post.id} className="text-sm text-white/70 border-l-2 border-brand-primary pl-3">
                <p>{post.content}</p>
                <span className="text-xs text-white/40">{new Date(post.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/40">Sin posts en el feed</p>
        )}
      </section>
    </div>
  )
}