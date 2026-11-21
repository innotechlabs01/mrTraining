'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Play, Trophy, Flame, Clock, BarChart3, Video, X, Award, Gift, Sparkles, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { goClient } from '@/lib/api/go-client'
import { toast } from 'sonner'
import type { Challenge, ScoringType, DifficultyLevel, ChallengeLeaderboardEntry, ChallengeExercise } from '@/features/coach/types'
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

// Form-specific exercise type (subset of ChallengeExercise for input)
type FormExercise = Pick<ChallengeExercise, 'exerciseType' | 'title' | 'description' | 'videoUrl' | 'targetSets' | 'targetReps' | 'targetWeightKg'>

type FormState = {
  title: string
  description: string
  exerciseType: string
  videoUrl: string
  exercises: FormExercise[]
  scoringType: ScoringType
  difficultyLevel: DifficultyLevel
  maxAttempts: number
  endDate: string
  badgeId: string
  badgeTitle: string
  incentiveText: string
  isPruebaDeFuego: boolean
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  exerciseType: 'sentadilla',
  videoUrl: '',
  exercises: [{ exerciseType: 'sentadilla' }],
  scoringType: 'form_score',
  difficultyLevel: 'intermediate',
  maxAttempts: 2,
  endDate: '',
  badgeId: 'challenge-finisher',
  badgeTitle: 'Retador',
  incentiveText: '',
  isPruebaDeFuego: false,
}

function buildPruebaDeFuegoForm(): FormState {
  const end = new Date()
  end.setDate(end.getDate() + 7)
  return {
    title: 'Prueba de Fuego — Técnica & Resistencia',
    description:
      'Circuito oficial de evaluación: graba tus series cumpliendo la postura y rango completo para desbloquear la insignia Prueba de Fuego y ganar incentivo del coach.',
    exerciseType: 'sentadilla',
    videoUrl: '',
    exercises: [
      { exerciseType: 'sentadilla', title: 'Sentadilla Profunda', targetSets: 3, targetReps: 12 },
      { exerciseType: 'flexiones', title: 'Flexiones Controladas', targetSets: 3, targetReps: 15 },
      { exerciseType: 'plancha', title: 'Plancha Isométrica', targetSets: 3, targetReps: 1 },
    ],
    scoringType: 'form_score',
    difficultyLevel: 'advanced',
    maxAttempts: 2,
    endDate: end.toISOString().split('T')[0],
    badgeId: 'prueba-de-fuego',
    badgeTitle: 'Prueba de Fuego',
    incentiveText: 'Insignia exclusiva + sesión 1-a-1 de feedback',
    isPruebaDeFuego: true,
  }
}

function challengeToForm(ch: Challenge): FormState {
  return {
    title: ch.title,
    description: ch.description ?? '',
    exerciseType: ch.exerciseType,
    videoUrl: ch.videoUrl ?? '',
    exercises: ch.exercises?.map(e => ({
      exerciseType: e.exerciseType,
      title: e.title ?? '',
      description: e.description ?? '',
      videoUrl: e.videoUrl ?? '',
      targetSets: e.targetSets,
      targetReps: e.targetReps,
      targetWeightKg: e.targetWeightKg,
    })) ?? [{ exerciseType: ch.exerciseType }],
    scoringType: ch.scoringType,
    difficultyLevel: ch.difficultyLevel,
    maxAttempts: ch.maxAttempts,
    endDate: ch.endDate ?? '',
    badgeId: ch.badgeId || (ch.isPruebaDeFuego ? 'prueba-de-fuego' : 'challenge-finisher'),
    badgeTitle: ch.badgeTitle || (ch.isPruebaDeFuego ? 'Prueba de Fuego' : 'Retador'),
    incentiveText: ch.incentiveText ?? '',
    isPruebaDeFuego: Boolean(ch.isPruebaDeFuego),
  }
}

type GamificationKPIsResponse = {
  data?: {
    summary: {
      total_athletes: number
      active_streaks: number
      avg_streak: number
      longest_streak: number
      total_badges_awarded: number
      challenges_completed_count: number
    }
    athletes: Array<{
      athlete_id: string
      athlete_name: string
      current_streak: number
      longest_streak: number
      last_workout_date?: string
      badges_count: number
      badge_ids: string[]
      challenges_completed: number
      reward_eligible: boolean
    }>
    badge_catalog: Array<{
      id: string
      title: string
      description: string
      category: string
    }>
  }
}

export default function CoachChallengesPage() {
  const queryClient = useQueryClient()
  const { challenges, isLoading, createChallenge, updateChallenge, activateChallenge, deleteChallenge } = useChallenges()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Challenge | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<{ challenge: Challenge; stats: ChallengeStats; leaderboard: ChallengeLeaderboardEntry[] } | null>(null)
  const [awardTarget, setAwardTarget] = useState<{ athleteId: string; athleteName: string } | null>(null)
  const [awardBadgeId, setAwardBadgeId] = useState('incentivo-coach')
  const [awardNote, setAwardNote] = useState('')
  const [awardSaving, setAwardSaving] = useState(false)

  const { data: kpisData } = useQuery({
    queryKey: ['coach', 'gamification', 'kpis'],
    queryFn: async () => {
      try {
        const res = await goClient.get<GamificationKPIsResponse>('/api/v1/coach/gamification/kpis')
        return res?.data ?? null
      } catch {
        return null
      }
    },
    staleTime: 30_000,
  })

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openPruebaDeFuego = () => { setEditing(null); setForm(buildPruebaDeFuegoForm()); setShowForm(true) }
  const openEdit = (ch: Challenge) => { setEditing(ch); setForm(challengeToForm(ch)); setShowForm(true) }

  const handleAwardSubmit = async () => {
    if (!awardTarget) return
    setAwardSaving(true)
    try {
      await goClient.post('/api/v1/coach/gamification/award-badge', {
        athlete_id: awardTarget.athleteId,
        badge_id: awardBadgeId,
        incentive_note: awardNote,
      })
      toast.success(`Insignia otorgada a ${awardTarget.athleteName}`)
      setAwardTarget(null)
      setAwardNote('')
      await queryClient.invalidateQueries({ queryKey: ['coach', 'gamification', 'kpis'] })
    } catch {
      toast.error('No se pudo otorgar la insignia')
    } finally {
      setAwardSaving(false)
    }
  }

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
      // Convert FormExercise[] to ChallengeExercise[] for API
      const apiExercises = form.exercises.map((ex, idx) => ({
        ...ex,
        id: '',
        challengeId: '',
        orderIndex: idx,
        createdAt: '',
        updatedAt: '',
      }))

      if (editing) {
        await updateChallenge(editing.id, {
          title: form.title,
          description: form.description,
          exerciseType: form.exercises[0]?.exerciseType || form.exerciseType,
          videoUrl: form.videoUrl || undefined,
          exercises: apiExercises,
          scoringType: form.scoringType,
          difficultyLevel: form.difficultyLevel,
          maxAttempts: form.maxAttempts,
          endDate: form.endDate,
          badgeId: form.badgeId,
          badgeTitle: form.badgeTitle,
          incentiveText: form.incentiveText,
          isPruebaDeFuego: form.isPruebaDeFuego,
        })
      } else {
        await createChallenge({
          title: form.title,
          description: form.description,
          exerciseType: form.exercises[0]?.exerciseType || form.exerciseType,
          videoUrl: form.videoUrl || undefined,
          exercises: form.exercises,
          scoringType: form.scoringType,
          difficultyLevel: form.difficultyLevel,
          maxAttempts: form.maxAttempts,
          endDate: form.endDate,
          durationMinutes: 0,
          calories: 0,
          badgeId: form.badgeId,
          badgeTitle: form.badgeTitle,
          incentiveText: form.incentiveText,
          isPruebaDeFuego: form.isPruebaDeFuego,
        })
      }
      setShowForm(false)
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  const kpiSummary = kpisData?.summary
  const kpiAthletes = kpisData?.athletes ?? []
  const badgeCatalog = kpisData?.badge_catalog ?? [
    { id: 'prueba-de-fuego', title: 'Prueba de Fuego', description: 'Superaste una Prueba de Fuego oficial del coach', category: 'challenge' },
    { id: 'incentivo-coach', title: 'Reconocimiento del Coach', description: 'Insignia e incentivo otorgado por tu coach', category: 'reward' },
    { id: 'streak-7', title: 'Semana Perfecta', description: '7 días seguidos entrenando', category: 'streak' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Desafíos, Rachas & KPIs</h1>
          <p className="text-sm text-white/40 mt-1">Crea desafíos con video, otorga insignias e incentives a tus atletas según sus rachas</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openPruebaDeFuego}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-300 text-sm font-medium hover:bg-orange-500/20 transition-colors"
          >
            <Flame size={16} />
            Plantilla Prueba de Fuego
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors"
          >
            <Plus size={16} />
            Nuevo Desafío
          </button>
        </div>
      </div>

      {/* KPIs de Gamificación y Rachas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/10 bg-surface-1 p-4">
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>Rachas activas</span>
            <Flame size={15} className="text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1.5 tabular-nums">{kpiSummary?.active_streaks ?? 0}</p>
          <p className="text-[11px] text-white/35 mt-0.5">de {kpiSummary?.total_athletes ?? 0} atletas</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-1 p-4">
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>Racha promedio</span>
            <Sparkles size={15} className="text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1.5 tabular-nums">{(kpiSummary?.avg_streak ?? 0).toFixed(1)}d</p>
          <p className="text-[11px] text-white/35 mt-0.5">Récord del equipo: {kpiSummary?.longest_streak ?? 0}d</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-1 p-4">
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>Desafíos completados</span>
            <CheckCircle2 size={15} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1.5 tabular-nums">{kpiSummary?.challenges_completed_count ?? 0}</p>
          <p className="text-[11px] text-white/35 mt-0.5">Intentos validados</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-1 p-4">
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>Insignias otorgadas</span>
            <Award size={15} className="text-brand-primary" />
          </div>
          <p className="text-2xl font-bold text-white mt-1.5 tabular-nums">{kpiSummary?.total_badges_awarded ?? 0}</p>
          <p className="text-[11px] text-white/35 mt-0.5">Reconocimiento e incentivos</p>
        </div>
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
              className="rounded-lg border border-white/5 bg-surface-1 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-white truncate">{ch.title}</h3>
                    {ch.isPruebaDeFuego && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/20">
                        🔥 Prueba de Fuego
                      </span>
                    )}
                    {ch.badgeTitle && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-brand-primary/15 text-brand-primary">
                        🏅 {ch.badgeTitle}
                      </span>
                    )}
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', STATUS_META[ch.status].color)}>
                      {STATUS_META[ch.status].label}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5 truncate">
                    {ch.exercises && ch.exercises.length > 0
                      ? ch.exercises.map(e => e.exerciseType).join(', ')
                      : ch.exerciseType}
                    · {SCORING_LABELS[ch.scoringType]} · {DIFFICULTY_LABELS[ch.difficultyLevel]}
                  </p>
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
          <div className="w-full max-w-2xl rounded-lg border border-white/10 bg-surface-1 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white">{editing ? 'Editar desafío' : 'Nuevo desafío'}</h3>

            <div className="space-y-4">
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

              {/* Challenge Demo Video */}
              <div>
                <label className="text-xs text-white/40">Video demo del desafío</label>
                <div className="mt-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 50 * 1024 * 1024) {
                          alert('Archivo muy grande (máx 50 MB)')
                          return
                        }
                        const formData = new FormData()
                        formData.append('file', file)
                        formData.append('title', form.title || 'Demo')
                        if (editing) formData.append('challengeId', editing.id)
                        try {
                          const res = await fetch('/api/coach/challenge-videos/upload', {
                            method: 'POST',
                            body: formData,
                          })
                          const data = await res.json()
                          if (data.videoUrl) {
                            setForm({ ...form, videoUrl: data.videoUrl })
                          } else {
                            alert(data.error || 'Error subiendo video')
                          }
                        } catch {
                          alert('Error subiendo video')
                        }
                        // reset input
                        e.target.value = ''
                      }}
                      className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white focus:border-brand-primary focus:outline-none"
                    />
                    {form.videoUrl && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, videoUrl: '' })}
                        className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  {form.videoUrl && (
                    <video
                      src={form.videoUrl}
                      className="w-full max-h-48 rounded-lg"
                      controls
                      muted
                    />
                  )}
                  <p className="text-[10px] text-white/30">MP4, MOV, WebM · máx 50 MB</p>
                </div>
              </div>

              {/* Exercises */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/40">Ejercicios (opcional, múltiples)</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, exercises: [...form.exercises, { exerciseType: '' }] })}
                    className="px-2 py-1 text-xs rounded bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30"
                  >
                    + Agregar ejercicio
                  </button>
                </div>
                <div className="space-y-3">
                  {form.exercises.map((ex, idx) => (
                    <div key={idx} className="rounded-lg border border-white/10 p-3 bg-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">Ejercicio {idx + 1}</span>
                        {form.exercises.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, exercises: form.exercises.filter((_, i) => i !== idx) })}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-white/30">Tipo</label>
                          <input
                            value={ex.exerciseType}
                            onChange={(e) => {
                              const newExercises = [...form.exercises]
                              newExercises[idx] = { ...newExercises[idx], exerciseType: e.target.value }
                              setForm({ ...form, exercises: newExercises })
                            }}
                            placeholder="sentadilla"
                            className="w-full mt-1 px-2 py-1.5 rounded border border-white/10 bg-white/5 text-xs text-white focus:border-brand-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/30">Título (opcional)</label>
                          <input
                            value={ex.title ?? ''}
                            onChange={(e) => {
                              const newExercises = [...form.exercises]
                              newExercises[idx] = { ...newExercises[idx], title: e.target.value || undefined }
                              setForm({ ...form, exercises: newExercises })
                            }}
                            placeholder="Sentadilla con pausa"
                            className="w-full mt-1 px-2 py-1.5 rounded border border-white/10 bg-white/5 text-xs text-white focus:border-brand-primary focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/30">Descripción / Cues (opcional)</label>
                        <textarea
                          value={ex.description ?? ''}
                          onChange={(e) => {
                            const newExercises = [...form.exercises]
                            newExercises[idx] = { ...newExercises[idx], description: e.target.value || undefined }
                            setForm({ ...form, exercises: newExercises })
                          }}
                          rows={2}
                          placeholder="Mantén el core activado, baja controlado..."
                          className="w-full mt-1 px-2 py-1.5 rounded border border-white/10 bg-white/5 text-xs text-white focus:border-brand-primary focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="video/mp4,video/quicktime,video/webm"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            if (file.size > 50 * 1024 * 1024) {
                              alert('Archivo muy grande (máx 50 MB)')
                              return
                            }
                            const formData = new FormData()
                            formData.append('file', file)
                            formData.append('title', ex.title || ex.exerciseType || 'Ejercicio')
                            if (editing) formData.append('challengeId', editing.id)
                            try {
                              const res = await fetch('/api/coach/challenge-videos/upload', {
                                method: 'POST',
                                body: formData,
                              })
                              const data = await res.json()
                              if (data.videoUrl) {
                                const newExercises = [...form.exercises]
                                newExercises[idx] = { ...newExercises[idx], videoUrl: data.videoUrl }
                                setForm({ ...form, exercises: newExercises })
                              } else {
                                alert(data.error || 'Error subiendo video')
                              }
                            } catch {
                              alert('Error subiendo video')
                            }
                            e.target.value = ''
                          }}
                          className="flex-1 px-2 py-1.5 rounded border border-white/10 bg-white/5 text-[10px] text-white focus:border-brand-primary focus:outline-none"
                        />
                        {ex.videoUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              const newExercises = [...form.exercises]
                              newExercises[idx] = { ...newExercises[idx], videoUrl: undefined }
                              setForm({ ...form, exercises: newExercises })
                            }}
                            className="px-2 py-1.5 rounded bg-red-500/20 text-red-400 text-[10px] hover:bg-red-500/30"
                          >
                            Quitar video
                          </button>
                        )}
                      </div>
                      {ex.videoUrl && (
                        <video src={ex.videoUrl} className="w-full max-h-32 rounded" controls muted />
                      )}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div>
                          <label className="text-[10px] text-white/30">Series</label>
                          <input
                            type="number"
                            min={1}
                            value={ex.targetSets ?? ''}
                            onChange={(e) => {
                              const newExercises = [...form.exercises]
                              newExercises[idx] = { ...newExercises[idx], targetSets: Number(e.target.value) || undefined }
                              setForm({ ...form, exercises: newExercises })
                            }}
                            className="w-full mt-1 px-2 py-1.5 rounded border border-white/10 bg-white/5 text-xs text-white focus:border-brand-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/30">Reps</label>
                          <input
                            type="number"
                            min={1}
                            value={ex.targetReps ?? ''}
                            onChange={(e) => {
                              const newExercises = [...form.exercises]
                              newExercises[idx] = { ...newExercises[idx], targetReps: Number(e.target.value) || undefined }
                              setForm({ ...form, exercises: newExercises })
                            }}
                            className="w-full mt-1 px-2 py-1.5 rounded border border-white/10 bg-white/5 text-xs text-white focus:border-brand-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/30">Peso (kg, opcional)</label>
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={ex.targetWeightKg ?? ''}
                            onChange={(e) => {
                              const newExercises = [...form.exercises]
                              newExercises[idx] = { ...newExercises[idx], targetWeightKg: Number(e.target.value) || undefined }
                              setForm({ ...form, exercises: newExercises })
                            }}
                            className="w-full mt-1 px-2 py-1.5 rounded border border-white/10 bg-white/5 text-xs text-white focus:border-brand-primary focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <label className="text-xs text-white/40">Fecha fin</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Insignia, Prueba de Fuego e Incentivo */}
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isPruebaDeFuego}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          isPruebaDeFuego: e.target.checked,
                          badgeId: e.target.checked ? 'prueba-de-fuego' : form.badgeId || 'challenge-finisher',
                          badgeTitle: e.target.checked ? 'Prueba de Fuego' : form.badgeTitle || 'Retador',
                        })
                      }
                      className="rounded border-white/20"
                    />
                    🔥 Marcar como &quot;Prueba de Fuego&quot; (otorga insignia especial al completar)
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm(buildPruebaDeFuegoForm())}
                    className="text-[11px] text-orange-300 hover:underline"
                  >
                    Cargar preset
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-white/50">Insignia al completar</label>
                    <input
                      value={form.badgeTitle}
                      onChange={(e) => setForm({ ...form, badgeTitle: e.target.value })}
                      placeholder="Ej: Prueba de Fuego"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50">Incentivo / Premio del coach</label>
                    <input
                      value={form.incentiveText}
                      onChange={(e) => setForm({ ...form, incentiveText: e.target.value })}
                      placeholder="Ej: 15% dto aliado o sesión extra"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white focus:border-brand-primary focus:outline-none"
                    />
                  </div>
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
          <div className="w-full max-w-sm rounded-lg border border-white/10 bg-surface-1 p-6">
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

      {/* Rachas de Atletas y Otorgamiento de Insignias / Incentivos */}
      <div className="rounded-xl border border-white/10 bg-surface-1 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">Rachas de tus atletas & Incentivos</h2>
            <p className="text-xs text-white/40">Identifica a los atletas más constantes y otorga insignias o premios motivacionales</p>
          </div>
        </div>
        {kpiAthletes.length === 0 ? (
          <p className="text-xs text-white/40 py-4">Aún no hay rachas ni atletas vinculados registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-white/40">
                  <th className="pb-2.5">Atleta</th>
                  <th className="pb-2.5">Racha actual</th>
                  <th className="pb-2.5">Mejor racha</th>
                  <th className="pb-2.5">Desafíos</th>
                  <th className="pb-2.5">Insignias</th>
                  <th className="pb-2.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {kpiAthletes.map((a) => (
                  <tr key={a.athlete_id} className="border-b border-white/5 text-sm">
                    <td className="py-2.5 font-medium text-white">
                      <div className="flex items-center gap-2">
                        <span>{a.athlete_name}</span>
                        {a.reward_eligible && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-medium">
                            Elegible incentivo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 text-orange-300 font-semibold tabular-nums">🔥 {a.current_streak}d</td>
                    <td className="py-2.5 text-white/60 tabular-nums">{a.longest_streak}d</td>
                    <td className="py-2.5 text-white/60 tabular-nums">{a.challenges_completed}</td>
                    <td className="py-2.5 text-brand-primary font-medium tabular-nums">🏅 {a.badges_count}</td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => setAwardTarget({ athleteId: a.athlete_id, athleteName: a.athlete_name })}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary/15 px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-brand-primary/25 transition-colors"
                      >
                        <Gift size={13} /> Otorgar insignia
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {awardTarget && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-surface-1 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Award size={18} className="text-brand-primary" />
                Otorgar insignia a {awardTarget.athleteName}
              </h3>
              <button onClick={() => setAwardTarget(null)} className="text-white/40 hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50">Selecciona insignia</label>
                <select
                  value={awardBadgeId}
                  onChange={(e) => setAwardBadgeId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white focus:outline-none"
                >
                  {badgeCatalog.map((b) => (
                    <option key={b.id} value={b.id} className="bg-surface-2 text-white">
                      {b.title} — {b.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50">Mensaje / Incentivo para el atleta</label>
                <textarea
                  rows={3}
                  value={awardNote}
                  onChange={(e) => setAwardNote(e.target.value)}
                  placeholder="Ej: ¡7 días de racha! Ganaste 15% de descuento en suplementos del aliado."
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAwardTarget(null)}
                className="px-4 py-2 rounded-lg text-xs text-white/60 hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={handleAwardSubmit}
                disabled={awardSaving}
                className="px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary/90 disabled:opacity-40"
              >
                {awardSaving ? 'Enviando…' : 'Otorgar y notificar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}