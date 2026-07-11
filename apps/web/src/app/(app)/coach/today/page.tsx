'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, PlayCircle, CheckCircle2, Circle, Clock, Sparkles, Radio, Video, MapPin, Users, NotebookPen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToday } from '@/features/coach/hooks/useToday'
import { useCoachPanel } from '@/features/coach/components/layout/CoachPanelContext'
import { useLiveSessions, effectiveStatus } from '@/features/coach/hooks/useLiveSessions'
import type { TimeBlock, TimeBlockId, TrainingMode } from '@/features/coach/types'
import { BLOCK_LABELS } from '@/features/coach/components/timeline/blockRegistry'

const MODALITY_META: Record<TrainingMode, { label: string; color: string; icon: React.ElementType }> = {
  virtual: { label: 'Virtual', color: 'text-sky-300 bg-sky-500/10 border-sky-400/20', icon: Video },
  presencial: { label: 'Presencial', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20', icon: MapPin },
  hibrido: { label: 'Híbrido', color: 'text-violet-300 bg-violet-500/10 border-violet-400/20', icon: Users },
  running: { label: 'Running', color: 'text-amber-300 bg-amber-500/10 border-amber-400/20', icon: NotebookPen },
}

const BLOCK_DESCRIPTIONS: Record<string, string> = {
  'morning-brief': 'Resumen AI de atletas y sesiones del día',
  'check-in': 'Registro de asistencia y banderas de los atletas',
  'session-prep': 'Prepara ejercicios y ajustes antes de la sesión',
  'live-session': 'Sesiones en vivo con métricas en tiempo real',
  'mid-day': 'Revisión de progreso a media jornada',
  'program-design': 'Diseña y ajusta programas de entrenamiento',
  communication: 'Mensajes y seguimiento con atletas',
  insights: 'Recomendaciones e insights de IA',
  'daily-summary': 'Cierre del día y métricas agregadas',
  'evening-recap': 'Resumen nocturno y preparación del siguiente día',
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function StatusBadge({ status }: { status: TimeBlock['status'] }) {
  if (status === 'current') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary/15 px-2 py-0.5 text-[10px] font-semibold text-brand-primary">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-primary opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-primary" />
        </span>
        En curso
      </span>
    )
  }
  if (status === 'past') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/40">
        <CheckCircle2 size={11} /> Completado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold text-white/50">
      <Clock size={11} /> Próximo
    </span>
  )
}

export default function CoachTodayPage() {
  const router = useRouter()
  const { blocks, currentBlock } = useToday()
  const { openPanel } = useCoachPanel()
  const { sessionsForDate, todayISO } = useLiveSessions()
  const todaysSessions = sessionsForDate(todayISO())

  const openBlock = (id: TimeBlockId) => openPanel('timeblock', { blockId: id })

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-surface-2 to-surface-1 p-6 sm:p-7"
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-primary/20 blur-3xl"
          animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-brand-primary/80">
              {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="mt-1.5 text-2xl font-bold font-display text-white sm:text-3xl">
              {getGreeting()}, Coach
            </h1>
            <p className="mt-1.5 text-sm text-white/40">
              {currentBlock ? (
                <>
                  Bloque actual:{' '}
                  <span className="text-white/70">{BLOCK_LABELS[currentBlock.id] ?? currentBlock.label}</span>
                </>
              ) : (
                'Sin bloques programados'
              )}
            </p>
          </div>
          <button
            onClick={() => openBlock('check-in')}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            <PlayCircle size={18} /> Start Today&apos;s Review
          </button>
        </div>
      </motion.div>

      {/* Timeline */}
      <div className="mt-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/70">
          <Sparkles size={15} className="text-brand-primary" /> Tu rutina de hoy
        </h2>
        <div className="relative">
          {/* vertical connector */}
          <div className="absolute left-[26px] top-3 bottom-3 w-px bg-gradient-to-b from-brand-primary/40 via-white/10 to-white/5 sm:left-[30px]" />
          <div className="space-y-2">
            {blocks.map((block, i) => (
              <motion.button
                key={block.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.05 * i, ease: 'easeOut' }}
                onClick={() => openBlock(block.id as TimeBlockId)}
                className={cn(
                  'group relative flex w-full items-center gap-4 rounded-2xl border p-3.5 text-left transition-all',
                  block.status === 'current'
                    ? 'border-brand-primary/40 bg-brand-primary/[0.06]'
                    : 'border-white/5 bg-surface-1 hover:border-white/10 hover:bg-surface-2',
                )}
              >
                <span
                  className={cn(
                    'z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                    block.status === 'current'
                      ? 'border-brand-primary bg-brand-primary/20 text-brand-primary'
                      : block.status === 'past'
                        ? 'border-white/10 bg-white/5 text-white/40'
                        : 'border-white/10 bg-surface-1 text-white/50',
                  )}
                >
                  {block.status === 'past' ? (
                    <CheckCircle2 size={15} />
                  ) : block.status === 'current' ? (
                    <Circle size={10} className="fill-brand-primary" />
                  ) : (
                    <Clock size={14} />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        'truncate text-sm font-semibold',
                        block.status === 'past' ? 'text-white/50' : 'text-white',
                      )}
                    >
                      {BLOCK_LABELS[block.id] ?? block.label}
                    </p>
                    <span className="shrink-0 text-[11px] tabular-nums text-white/40">{block.time}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="truncate text-xs text-white/40">
                      {BLOCK_DESCRIPTIONS[block.id] ?? ''}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusBadge status={block.status} />
                  <ArrowRight
                    size={14}
                    className="text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:text-white/50"
                  />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Live sessions de hoy */}
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white/70">
            <Radio size={15} className="text-brand-primary" /> Live Sessions de hoy
          </h2>
          <button
            onClick={() => router.push('/coach/live-session')}
            className="flex items-center gap-1 text-xs text-white/50 transition hover:text-brand-primary"
          >
            Gestionar <ArrowRight size={13} />
          </button>
        </div>
        {todaysSessions.length === 0 ? (
          <button
            onClick={() => router.push('/coach/live-session')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-surface-1 px-4 py-6 text-sm text-white/40 transition hover:border-brand-primary/30 hover:text-brand-primary"
          >
            <PlusSM /> Añadir una sesión en vivo
          </button>
        ) : (
          <div className="space-y-2">
            {todaysSessions.map((s, i) => {
              const meta = MODALITY_META[s.modality]
              const Icon = meta.icon
              const st = effectiveStatus(s)
              const stCls =
                st === 'live'
                  ? 'text-brand-primary bg-brand-primary/15'
                  : st === 'cancelled'
                    ? 'text-rose-300 bg-rose-500/10'
                    : st === 'completed'
                      ? 'text-white/40 bg-white/5'
                      : 'text-sky-300 bg-sky-500/10'
              return (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.05 * i, ease: 'easeOut' }}
                  onClick={() => router.push('/coach/live-session')}
                  className="group relative flex w-full items-center gap-4 rounded-2xl border border-white/5 bg-surface-1 p-3.5 text-left transition-all hover:border-white/10 hover:bg-surface-2"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white/10 bg-surface-1 text-brand-primary">
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{s.title}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {s.startTime}–{s.endTime}
                      </span>
                      <span className="flex items-center gap-1">
                        {s.enrolled}/{s.capacity}
                        {s.enrolled >= s.capacity && <span className="text-rose-300">· lleno</span>}
                      </span>
                    </p>
                  </div>
                  <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium', meta.color)}>
                    {meta.label}
                  </span>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', stCls)}>
                    {st === 'live' ? 'En vivo' : st === 'cancelled' ? 'Cancelada' : st === 'completed' ? 'Finalizada' : 'Próxima'}
                  </span>
                  <ArrowRight
                    size={14}
                    className="shrink-0 text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:text-white/50"
                  />
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function PlusSM() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
