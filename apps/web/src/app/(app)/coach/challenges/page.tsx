'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Play, Trophy, Flame, Clock, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Challenge, ScoringType, DifficultyLevel, ChallengeLeaderboardEntry } from '@/features/coach/types'
import { useChallenges, getChallengeLeaderboard, getChallengeStats, subscribeChallengeLeaderboard, type ChallengeStats } from '@/features/coach/hooks/useChallenges'

const STATUS_META: Record<Challenge['status'], { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-amber-500/10 text-amber-400' },
  active: { label: 'Activo', color: 'bg-emerald-500/10 text-emerald-400' },
  completed: { label: 'Completado', color: 'bg-blue-500/10 text-blue-400' },
  expired: { label: 'Expirado', color: 'bg-red-500/10 text-red-400' },
}

const SCORING_LABELS: Record<ScoringType, string> = {
  form_score: 'Forma',
  total_volume: 'Volumen',
  consistency: 'Consistencia',
}

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

type FormState = {
  title: string
  description: string
  exerciseType: string
  scoringType: ScoringType
  difficultyLevel: DifficultyLevel
  maxAttempts: number
  endDate: string
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  exerciseType: 'sentadilla',
  scoringType: 'form_score',
  difficultyLevel: 'intermediate',
  maxAttempts: 2,
  endDate: '',
}

function challengeToForm(ch: Challenge): FormState {
  return {
    title: ch.title,
    description: ch.description ?? '',
    exerciseType: ch.exerciseType,
    scoringType: ch.scoringType,
    difficultyLevel: ch.difficultyLevel,
    maxAttempts: ch.maxAttempts,
    endDate: ch.endDate ?? '',
  }
}

export default function CoachChallengesPage() {
  const { challenges, isLoading, createChallenge, updateChallenge, activateChallenge, deleteChallenge } = useChallenges()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Challenge | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<{ challenge: Challenge; stats: ChallengeStats; leaderboard: ChallengeLeaderboardEntry[] } | null>(null)

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit = (ch: Challenge) => { setEditing(ch); setForm(challengeToForm(ch)); setShowForm(true) }

  const openDetail = async (ch: Challenge) => {
    const [stats, leaderboard] = await Promise.all([
      getChallengeStats(ch.id),
      getChallengeLeaderboard(ch.id),
    ])
    setDetail({ challenge: ch, stats, leaderboard })
  }

  // Live-refresh the leaderboard when an attempt is submitted.
  useEffect(() => {
    if (!detail) return
    return subscribeChallengeLeaderboard(detail.challenge.id, (entries) => {
      setDetail((prev) => (prev ? { ...prev, leaderboard: entries } : prev))
    })
  }, [detail?.challenge.id])

  const handleSubmit = async () => {
    if (!form.title || !form.endDate) return
    setSaving(true)
    try {
      if (editing) {
        await updateChallenge(editing.id, {
          title: form.title,
          description: form.description,
          exerciseType: form.exerciseType,
          scoringType: form.scoringType,
          difficultyLevel: form.difficultyLevel,
          maxAttempts: form.maxAttempts,
          endDate: form.endDate,
        })
      } else {
        await createChallenge({
          title: form.title,
          description: form.description,
          exerciseType: form.exerciseType,
          scoringType: form.scoringType,
          difficultyLevel: form.difficultyLevel,
          maxAttempts: form.maxAttempts,
          endDate: form.endDate,
          durationMinutes: 0,
          calories: 0,
        })
      }
      setShowForm(false)
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Desafíos</h1>
          <p className="text-sm text-white/40 mt-1">Crea desafíos de video y publica la tabla de posiciones para tus atletas</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors"
        >
          <Plus size={16} />
          Nuevo Desafío
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <Flame className="mx-auto mb-3 size-10 text-white/20" />
          <p className="text-sm">No hay desafíos todavía.</p>
          <p className="text-xs mt-1">Crea el primero para motivar a tus atletas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map((ch, i) => (
            <motion.div
              key={ch.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-white/5 bg-surface-1 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white truncate">{ch.title}</h3>
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', STATUS_META[ch.status].color)}>
                      {STATUS_META[ch.status].label}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5 truncate">{ch.exerciseType} · {SCORING_LABELS[ch.scoringType]} · {DIFFICULTY_LABELS[ch.difficultyLevel]}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-white/30">
                    <span className="flex items-center gap-1"><Clock size={12} /> {ch.endDate ?? '—'}</span>
                    <span>Intentos: {ch.maxAttempts}</span>
                    {ch.daysLeft != null && (
                      <span className={cn(ch.isUrgent && 'text-red-400')}>{ch.daysLeft} días restantes</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {ch.status !== 'draft' && (
                    <button
                      onClick={() => openDetail(ch)}
                      className="p-1.5 rounded-md text-white/40 hover:text-brand-primary hover:bg-white/10 transition-colors"
                      title="Ver estadísticas"
                    >
                      <BarChart3 size={16} />
                    </button>
                  )}
                  {ch.status === 'active' && (
                    <button
                      onClick={() => openDetail(ch)}
                      className="p-1.5 rounded-md text-white/40 hover:text-brand-primary hover:bg-white/10 transition-colors"
                      title="Ver tabla de posiciones"
                    >
                      <Trophy size={16} />
                    </button>
                  )}
                  {ch.status === 'draft' && (
                    <>
                      <button
                        onClick={() => activateChallenge(ch.id)}
                        className="p-1.5 rounded-md text-white/40 hover:text-emerald-400 hover:bg-white/10 transition-colors"
                        title="Activar"
                      >
                        <Play size={16} />
                      </button>
                      <button
                        onClick={() => openEdit(ch)}
                        className="p-1.5 rounded-md text-white/40 hover:text-brand-primary hover:bg-white/10 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deleteChallenge(ch.id)}
                        className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-red-500/15 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface-1 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">{editing ? 'Editar desafío' : 'Nuevo desafío'}</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/40">Título</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/40">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/40">Ejercicio</label>
                <input
                  value={form.exerciseType}
                  onChange={(e) => setForm({ ...form, exerciseType: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40">Puntuación</label>
                  <select
                    value={form.scoringType}
                    onChange={(e) => setForm({ ...form, scoringType: e.target.value as ScoringType })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white focus:border-brand-primary focus:outline-none"
                  >
                    <option value="form_score">Forma</option>
                    <option value="total_volume">Volumen</option>
                    <option value="consistency">Consistencia</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40">Dificultad</label>
                  <select
                    value={form.difficultyLevel}
                    onChange={(e) => setForm({ ...form, difficultyLevel: e.target.value as DifficultyLevel })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white focus:border-brand-primary focus:outline-none"
                  >
                    <option value="beginner">Principiante</option>
                    <option value="intermediate">Intermedio</option>
                    <option value="advanced">Avanzado</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40">Intentos máx.</label>
                  <input
                    type="number"
                    min={1}
                    value={form.maxAttempts}
                    onChange={(e) => setForm({ ...form, maxAttempts: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white focus:border-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40">Fecha fin (YYYY-MM-DD)</label>
                  <input
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    placeholder="2026-09-15"
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowForm(false); setEditing(null) }}
                className="px-4 py-2 rounded-lg text-sm text-white/60 hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !form.title || !form.endDate}
                className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium disabled:opacity-40"
              >
                {saving ? 'Guardando…' : editing ? 'Guardar' : 'Crear borrador'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface-1 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Trophy size={18} className="text-brand-primary" />
                {detail.challenge.title}
              </h3>
              <button onClick={() => setDetail(null)} className="text-white/40 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="rounded-lg bg-white/5 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Intentos</p>
                <p className="text-lg font-bold text-white">{detail.stats.totalAttempts}</p>
              </div>
              <div className="rounded-lg bg-white/5 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Atletas</p>
                <p className="text-lg font-bold text-white">{detail.stats.uniqueAthletes}</p>
              </div>
              <div className="rounded-lg bg-white/5 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Forma prom.</p>
                <p className="text-lg font-bold text-white">{detail.stats.avgFormScore.toFixed(1)}</p>
              </div>
              <div className="rounded-lg bg-white/5 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Mejor forma</p>
                <p className="text-lg font-bold text-brand-primary">{detail.stats.bestFormScore.toFixed(1)}</p>
              </div>
            </div>

            <p className="text-xs text-white/40 mb-2">Tabla de posiciones</p>
            {detail.leaderboard.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-6">Sin intentos completados todavía.</p>
            ) : (
              <div className="space-y-2">
                {detail.leaderboard.map((e) => (
                  <div key={e.athleteId} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
                    <span className={cn('w-6 text-center font-bold', e.rank <= 3 ? 'text-brand-primary' : 'text-white/40')}>{e.rank}</span>
                    <span className="flex-1 text-sm text-white truncate">{e.athleteName}</span>
                    <span className="text-sm font-semibold text-brand-primary">{e.bestScore.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}