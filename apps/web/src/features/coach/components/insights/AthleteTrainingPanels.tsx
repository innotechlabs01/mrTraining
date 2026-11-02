'use client'

import { useAthleteTrainingIntel } from '@/features/coach/hooks/useAthleteTrainingIntel'
import { Dumbbell, Flame, Gauge, TrendingUp, type LucideIcon } from 'lucide-react'

const FATIGUE_STATE_COLOR: Record<string, string> = {
  ready: 'bg-emerald-400',
  recovering: 'bg-amber-400',
  fatigued: 'bg-rose-400',
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

function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/5 bg-surface-1 p-5 h-32 animate-pulse" />
      ))}
    </div>
  )
}

/**
 * Training-intelligence panels for one athlete: logged-volume summary, estimated-1RM
 * leaders, muscle fatigue map and aggregated RIR/RPE effort. All numbers derive from
 * real logged sets — nothing here is self-reported.
 */
export function AthleteTrainingPanels({ athleteId }: { athleteId: string }) {
  const { intel, isLoading, error } = useAthleteTrainingIntel(athleteId)

  if (isLoading) return <Skeleton />
  if (error) {
    return (
      <p className="text-sm text-white/40 rounded-xl border border-white/5 bg-surface-1 p-5">
        No se pudo cargar el entrenamiento: {error}
      </p>
    )
  }

  const { summary, oneRm, fatigue, effort } = intel
  const hasAnyData = summary && summary.sessions > 0

  return (
    <div className="space-y-4">
      {!hasAnyData && (
        <p className="text-sm text-white/40 rounded-xl border border-white/5 bg-surface-1 p-5">
          Sin sesiones completadas todavía. Los paneles aparecen cuando tu atleta loggee su primer entrenamiento.
        </p>
      )}

      {hasAnyData && summary && (
        <Panel title={`Entrenamiento · últimos ${summary.windowDays} días`} icon={Dumbbell}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-white font-display">{summary.sessions}</p>
              <p className="text-xs text-white/40">Sesiones</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white font-display">{Math.round(summary.avgSessionsPerWeek)}</p>
              <p className="text-xs text-white/40">Por semana</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white font-display">{summary.totalVolumeKg.toLocaleString()} kg</p>
              <p className="text-xs text-white/40">Volumen</p>
            </div>
          </div>
          {summary.recentSessions.length > 0 && (
            <ul className="space-y-1.5 pt-2 border-t border-white/5">
              {summary.recentSessions.map((s) => (
                <li key={`${s.date}-${s.workoutName}`} className="flex justify-between text-xs">
                  <span className="text-white/60">{s.workoutName || 'Entrenamiento'}</span>
                  <span className="text-white/30">{s.date} · {s.exercises} ejercicios</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {fatigue && fatigue.muscles.length > 0 && (
        <Panel title="Mapa de fatiga muscular (volumen loggeado)" icon={Flame}>
          <ul className="space-y-2.5">
            {fatigue.muscles.slice(0, 8).map((m) => (
              <li key={m.muscle} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${FATIGUE_STATE_COLOR[m.state] ?? 'bg-white/20'}`} />
                <span className="text-xs text-white/60 w-24 capitalize truncate">{m.muscle}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full ${FATIGUE_STATE_COLOR[m.state] ?? 'bg-white/20'}`}
                    style={{ width: `${Math.round(m.level * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-white/30 w-16 text-right">
                  {m.state === 'ready' ? 'listo' : m.state === 'recovering' ? 'recuperando' : 'fatigado'}
                </span>
              </li>
            ))}
          </ul>
          {fatigue.neglectedMuscles.length > 0 && (
            <p className="text-xs text-white/40 pt-2 border-t border-white/5">
              Sin entrenar en la ventana: <span className="text-white/60 capitalize">{fatigue.neglectedMuscles.join(', ')}</span>
            </p>
          )}
        </Panel>
      )}

      {oneRm && oneRm.exercises.length > 0 && (
        <Panel title="1RM estimado (mejores)" icon={TrendingUp}>
          <ul className="space-y-2">
            {oneRm.exercises.slice(0, 6).map((e) => (
              <li key={e.exerciseKey} className="flex justify-between items-center text-xs">
                <span className="text-white/60 truncate pr-3">{e.name}</span>
                <span className="text-white font-display whitespace-nowrap">
                  {e.best?.est} kg
                  <span className="text-white/30 ml-1.5">
                    desde {e.best?.weightKg}×{e.best?.reps}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {effort?.enabled && effort.summary && (
        <Panel title="Esfuerzo percibido (RIR/RPE)" icon={Gauge}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-white font-display">
                {effort.summary.avg != null ? effort.summary.avg.toFixed(1) : '—'}
              </p>
              <p className="text-xs text-white/40">RIR medio</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white font-display">
                {effort.summary.hardPct != null ? `${Math.round(effort.summary.hardPct * 100)}%` : '—'}
              </p>
              <p className="text-xs text-white/40">Sets ≤{effort.hardRirThreshold} RIR</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white font-display">{effort.summary.rated}/{effort.summary.done}</p>
              <p className="text-xs text-white/40">Sets calificados</p>
            </div>
          </div>
        </Panel>
      )}
    </div>
  )
}
