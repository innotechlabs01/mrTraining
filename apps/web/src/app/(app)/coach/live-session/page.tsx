'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  Video,
  Trash2,
  CheckCircle2,
  XCircle,
  NotebookPen,
  Globe,
  Minus,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLiveSessions, effectiveStatus, overlaps } from '@/features/coach/hooks/useLiveSessions'
import type { LiveSessionItem, TrainingMode } from '@/features/coach/types'

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MODALITY_META: Record<TrainingMode, { label: string; color: string; icon: React.ElementType }> = {
  virtual: { label: 'Virtual', color: 'text-sky-300 bg-sky-500/10 border-sky-400/20', icon: Video },
  presencial: { label: 'Presencial', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20', icon: MapPin },
  hibrido: { label: 'Híbrido', color: 'text-violet-300 bg-violet-500/10 border-violet-400/20', icon: Users },
  running: { label: 'Running', color: 'text-amber-300 bg-amber-500/10 border-amber-400/20', icon: NotebookPen },
}

const STATUS_META: Record<string, { label: string; cls: string; dot?: boolean }> = {
  live: { label: 'En vivo', cls: 'text-brand-primary bg-brand-primary/15 border-brand-primary/30', dot: true },
  scheduled: { label: 'Próxima', cls: 'text-sky-300 bg-sky-500/10 border-sky-400/20' },
  completed: { label: 'Finalizada', cls: 'text-white/40 bg-white/5 border-white/10' },
  cancelled: { label: 'Cancelada', cls: 'text-rose-300 bg-rose-500/10 border-rose-400/20' },
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function monthMatrix(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const startDay = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function minutesUntil(date: string, time: string) {
  const target = new Date(`${date}T${time}`).getTime()
  return Math.round((target - Date.now()) / 60000)
}

const emptyForm = {
  title: '',
  description: '',
  startTime: '07:00',
  endTime: '08:00',
  modality: 'presencial' as TrainingMode,
  location: '',
  link: '',
  distanceKm: '',
  pace: '',
  notes: '',
  publicSession: true,
  capacity: 10,
}

export default function LiveSessionsPage() {
  const { sessions, addSession, updateSession, removeSession, setEnrolled, sessionsForDate, todayISO } =
    useLiveSessions()
  const today = todayISO()

  const [view, setView] = useState(() => {
    const t = new Date()
    return { year: t.getFullYear(), month: t.getMonth() }
  })
  const [selected, setSelected] = useState<string>(today)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ ...emptyForm, date: today })
  const [formError, setFormError] = useState<string | null>(null)

  const days = useMemo(() => monthMatrix(view.year, view.month), [view])
  const daySessions = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of sessions) map.set(s.date, (map.get(s.date) ?? 0) + 1)
    return map
  }, [sessions])
  const selectedSessions = sessionsForDate(selected)

  const shiftMonth = (delta: number) => {
    setView((v) => {
      const m = v.month + delta
      const year = v.year + Math.floor(m / 12)
      const month = ((m % 12) + 12) % 12
      return { year, month }
    })
  }

  const openModal = (date?: string) => {
    setForm({ ...emptyForm, date: date ?? selected })
    setFormError(null)
    setModalOpen(true)
  }

  const submit = () => {
    if (!form.title.trim()) return setFormError('El título es obligatorio.')
    if (form.capacity < 1) return setFormError('La capacidad debe ser al menos 1.')
    if (form.endTime <= form.startTime) return setFormError('La hora de fin debe ser posterior al inicio.')

    if (form.date < today) return setFormError('No puedes agendar sesiones en fechas pasadas.')
    if (form.date === today) {
      const now = new Date().toTimeString().slice(0, 5)
      if (form.startTime < now) return setFormError('La hora de inicio ya pasó hoy.')
    }

    if (overlaps(sessions, form.date, form.startTime, form.endTime)) {
      return setFormError('Ese horario se solapa con otra sesión del mismo día.')
    }

    addSession({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      modality: form.modality,
      location: form.location.trim() || undefined,
      notes: form.notes.trim() || undefined,
      public: form.publicSession,
      capacity: form.capacity,
      link: form.link.trim() || undefined,
      distanceKm: form.distanceKm === '' ? undefined : Number(form.distanceKm),
      pace: form.pace.trim() || undefined,
    })
    setModalOpen(false)
  }

  const modalityMeta = (m: TrainingMode) => MODALITY_META[m]
  const statusMeta = (s: LiveSessionItem) => STATUS_META[effectiveStatus(s)]

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-brand-primary/10 p-2.5 text-brand-primary ring-1 ring-brand-primary/30">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Live Sessions</h1>
            <p className="text-sm text-white/50">Sesiones abiertas al público, por horario y con control de cupo</p>
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-[#04121f] shadow-lg shadow-brand-primary/20 transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> Añadir sesión
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Calendar */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {view.month === new Date().getMonth() && view.year === new Date().getFullYear()
                ? 'Este mes'
                : `${new Intl.DateTimeFormat('es', { month: 'long' }).format(new Date(view.year, view.month, 1))} ${view.year}`}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => shiftMonth(-1)}
                className="rounded-lg p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView({ year: new Date().getFullYear(), month: new Date().getMonth() })}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                Hoy
              </button>
              <button
                onClick={() => shiftMonth(1)}
                className="rounded-lg p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="py-1 text-center text-xs font-semibold text-white/40">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              if (!d) return <div key={i} />
              const iso = isoDate(d)
              const count = daySessions.get(iso) ?? 0
              const isToday = iso === today
              const isSelected = iso === selected
              return (
                <button
                  key={i}
                  onClick={() => setSelected(iso)}
                  className={cn(
                    'relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition',
                    isSelected
                      ? 'bg-brand-primary font-semibold text-[#04121f]'
                      : 'text-white/80 hover:bg-white/5',
                    isToday && !isSelected && 'ring-1 ring-brand-primary/50',
                  )}
                >
                  <span>{d.getDate()}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        'mt-0.5 flex h-1.5 w-1.5 items-center justify-center rounded-full',
                        isSelected ? 'bg-[#04121f]' : 'bg-brand-primary',
                      )}
                    />
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/50">
            {Object.entries(MODALITY_META).map(([m, meta]) => {
              const Icon = meta.icon
              return (
                <span key={m} className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-white/40" />
                  {meta.label}
                </span>
              )
            })}
          </div>
        </div>

        {/* Day list */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              {new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(
                new Date(`${selected}T12:00:00`),
              )}
            </h2>
            <button
              onClick={() => openModal(selected)}
              className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/70 transition hover:border-brand-primary/40 hover:text-brand-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Sesión
            </button>
          </div>

          {selectedSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/40">
              No hay sesiones este día.
            </div>
          ) : (
            <div className="space-y-3">
              {selectedSessions.map((s: LiveSessionItem) => {
                const meta = modalityMeta(s.modality)
                const Icon = meta.icon
                const st = statusMeta(s)
                const pct = s.capacity > 0 ? Math.min(100, Math.round((s.enrolled / s.capacity) * 100)) : 0
                const full = s.enrolled >= s.capacity
                const mins = effectiveStatus(s) === 'scheduled' ? minutesUntil(s.date, s.startTime) : 0
                return (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 transition hover:border-white/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{s.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {s.startTime}–{s.endTime}
                          </span>
                          {s.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {s.location}
                            </span>
                          )}
                          {s.public && (
                            <span className="flex items-center gap-1 text-brand-primary">
                              <Globe className="h-3.5 w-3.5" /> Pública
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          meta.color,
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                    </div>

                    {s.description && <p className="mt-2 text-xs text-white/40">{s.description}</p>}

                    {(s.modality === 'running' || s.modality === 'virtual' || s.modality === 'hibrido') && (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/40">
                        {s.modality === 'running' && s.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} /> {s.location}
                          </span>
                        )}
                        {s.modality === 'running' && s.distanceKm != null && (
                          <span>{s.distanceKm} km</span>
                        )}
                        {s.modality === 'running' && s.pace && <span>Ritmo {s.pace}</span>}
                        {s.link && (
                          <a
                            href={s.link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-brand-primary hover:underline"
                          >
                            <Video size={11} /> Enlace
                          </a>
                        )}
                      </div>
                    )}

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] text-white/50">
                        <span>
                          Cupo: <span className="text-white/80">{s.enrolled}</span> / {s.capacity}
                        </span>
                        <span className={cn(full && 'text-rose-300')}>
                          {full ? 'Completo' : `${s.capacity - s.enrolled} libres`}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className={cn('h-full rounded-full transition-all', full ? 'bg-rose-400' : 'bg-brand-primary')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEnrolled(s.id, s.enrolled - 1)}
                          disabled={s.enrolled <= 0}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-white/70 transition hover:bg-white/10 disabled:opacity-30"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs tabular-nums text-white/70">{s.enrolled}</span>
                        <button
                          onClick={() => setEnrolled(s.id, s.enrolled + 1)}
                          disabled={full}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-white/70 transition hover:bg-white/10 disabled:opacity-30"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                            st.cls,
                          )}
                        >
                          {st.dot && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-primary opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-primary" />
                            </span>
                          )}
                          {st.label}
                          {effectiveStatus(s) === 'scheduled' && mins > 0 && ` · ${mins}m`}
                        </span>
                        {s.status !== 'cancelled' && (
                          <button
                            onClick={() => updateSession(s.id, { status: 'cancelled' })}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-rose-300 transition hover:bg-rose-500/10"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => removeSession(s.id)}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/40 transition hover:bg-white/5 hover:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 12, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-[#0b1622] p-5 shadow-2xl"
            >
              <h3 className="mb-4 text-lg font-semibold text-white">Nueva sesión en vivo</h3>

              <div className="space-y-3">
                <Field label="Título">
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Ej. Clase abierta de técnica"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-primary/50"
                  />
                </Field>

                <Field label="Descripción (opcional)">
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    placeholder="En qué consiste la sesión"
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-primary/50"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fecha">
                    <input
                      type="date"
                      value={form.date}
                      min={today}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-brand-primary/50 [color-scheme:dark]"
                    />
                  </Field>
                  <Field label="Modalidad">
                    <select
                      value={form.modality}
                      onChange={(e) => setForm({ ...form, modality: e.target.value as TrainingMode })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-brand-primary/50"
                    >
                      {Object.entries(MODALITY_META).map(([m, meta]) => (
                        <option key={m} value={m} className="bg-[#0b1622]">
                          {meta.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Inicio">
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-brand-primary/50 [color-scheme:dark]"
                    />
                  </Field>
                  <Field label="Fin">
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-brand-primary/50 [color-scheme:dark]"
                    />
                  </Field>
                </div>

                <Field label="Ubicación (opcional)">
                  <input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder={
                      form.modality === 'running'
                        ? 'Punto de encuentro (Ej. Puerta principal del Parque)'
                        : form.modality === 'virtual'
                          ? 'Lugar o sala (opcional)'
                          : 'Ej. Gimnasio / Sala'
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-primary/50"
                  />
                </Field>

                {form.modality === 'virtual' || form.modality === 'hibrido' ? (
                  <Field label="Enlace de la sesión (opcional)">
                    <input
                      value={form.link}
                      onChange={(e) => setForm({ ...form, link: e.target.value })}
                      placeholder="https://meet/zoom/teams..."
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-primary/50"
                    />
                  </Field>
                ) : null}

                {form.modality === 'running' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Kilometraje (km)">
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={form.distanceKm}
                        onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
                        placeholder="Ej. 5"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-primary/50"
                      />
                    </Field>
                    <Field label="Ritmo (opcional)">
                      <input
                        value={form.pace}
                        onChange={(e) => setForm({ ...form, pace: e.target.value })}
                        placeholder="Ej. 5:30 /km"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-primary/50"
                      />
                    </Field>
                  </div>
                ) : null}

                <Field label="Cupo máximo de participantes">
                  <input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-brand-primary/50"
                  />
                </Field>

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm text-white/80">
                    <Globe className="h-4 w-4 text-brand-primary" /> Abierta al público
                  </span>
                  <input
                    type="checkbox"
                    checked={form.publicSession}
                    onChange={(e) => setForm({ ...form, publicSession: e.target.checked })}
                    className="h-4 w-4 accent-[#15aaf2]"
                  />
                </label>

                <Field label="Notas (opcional)">
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    placeholder="Indicaciones para la sesión"
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-primary/50"
                  />
                </Field>

                {formError && (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {formError}
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm text-white/60 transition hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={submit}
                  className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-[#04121f] transition hover:brightness-110"
                >
                  Crear sesión
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-white/50">{label}</span>
      {children}
    </label>
  )
}
