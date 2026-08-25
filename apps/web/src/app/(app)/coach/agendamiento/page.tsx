'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, User, Target, Dumbbell, CheckCircle2, XCircle, RefreshCw, MapPin, Video, Plus, Trash2, Save, CalendarClock } from 'lucide-react'
import { coachingApi } from '@/features/shared/api/client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Appointment = {
  id: string
  athleteId: string
  athleteName: string
  date: string
  startTime: string
  endTime: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  athleteSports: string[]
  athleteModality: string
  athleteLevel: string
  athleteGoal: string
  athleteFrequency: number
  athleteDuration: number
  athleteEquipment: string
  athleteRoutineAccepted: boolean
  notes: string
}

const SPORT_LABELS: Record<string, string> = {
  gym: 'Gym', running: 'Running', crossfit: 'CrossFit', swimming: 'Swimming',
  cycling: 'Cycling', tennis: 'Tennis', yoga: 'Yoga', soccer: 'Soccer',
}

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  rescheduled: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Agendada', completed: 'Completada', cancelled: 'Cancelada', rescheduled: 'Reprogramada',
}


export default function AgendamientoPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Cancel modal state
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)

  // Reschedule modal state
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null)
  const [resDate, setResDate] = useState<string>('')
  const [resStart, setResStart] = useState<string>('07:00')
  const [resEnd, setResEnd] = useState<string>('08:00')
  const [resNotes, setResNotes] = useState('')
  const [resLoading, setResLoading] = useState(false)

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const data = await coachingApi.getMemberships<Appointment[]>()  // reuse generic get
      // Use the actual appointments endpoint
      const resp = await fetch('/api/coaching/appointments')
      const json = await resp.json()
      setAppointments(json || [])
    } catch {
      setAppointments([])
      toast.error('Error al cargar citas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAppointments() }, [])

  const handleComplete = async (id: string) => {
    try {
      const resp = await fetch(`/api/coaching/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'completed' }),
      })
      if (!resp.ok) throw new Error('failed')
      toast.success('Cita aprobada')
      fetchAppointments()
    } catch {
      toast.error('Error al aprobar cita')
    }
  }

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return
    setCancelLoading(true)
    try {
      const resp = await fetch(`/api/coaching/appointments/${cancelTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cancelTarget.id, status: 'cancelled', notes: cancelReason }),
      })
      if (!resp.ok) throw new Error('failed')
      toast.success('Cita cancelada')
      setCancelTarget(null)
      setCancelReason('')
      fetchAppointments()
    } catch {
      toast.error('Error al cancelar cita')
    } finally {
      setCancelLoading(false)
    }
  }

  const handleRescheduleConfirm = async () => {
    if (!rescheduleTarget) return
    if (!resDate) {
      toast.error('Selecciona una fecha')
      return
    }
    if (resStart >= resEnd) {
      toast.error('La hora de inicio debe ser anterior a la hora de fin')
      return
    }
    setResLoading(true)
    try {
      const resp = await fetch(`/api/coaching/appointments/${rescheduleTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rescheduleTarget.id, status: 'rescheduled', date: resDate, startTime: resStart, endTime: resEnd, notes: resNotes || undefined }),
      })
      if (!resp.ok) throw new Error('failed')
      toast.success('Cita reprogramada')
      setRescheduleTarget(null)
      fetchAppointments()
    } catch {
      toast.error('Error al reprogramar cita')
    } finally {
      setResLoading(false)
    }
  }

  const openReschedule = (a: Appointment) => {
    setRescheduleTarget(a)
    setResDate(a.date)
    setResStart(a.startTime)
    setResEnd(a.endTime)
    setResNotes('')
  }

  const today = new Date()
  const next14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  const filtered = selectedDate
    ? appointments.filter((a) => a.date === selectedDate)
    : appointments.filter((a) => a.status !== 'cancelled')

  const formatDate = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`)
    return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Agendamiento</h1>
          <p className="text-sm text-white/40 mt-1">
            {appointments.filter((a) => a.status === 'scheduled').length} citas pendientes
          </p>
        </div>
        <button
          onClick={fetchAppointments}
          className="p-2 rounded-lg border border-white/10 text-white/40 hover:text-white/70 transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Date Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedDate(null)}
          className={cn(
            'shrink-0 px-4 py-2 rounded-xl text-xs font-medium border transition-all',
            !selectedDate ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-white/10 text-white/40 hover:border-white/20',
          )}
        >
          Todas
        </button>
        {next14Days.map((d) => {
          const count = appointments.filter((a) => a.date === d && a.status === 'scheduled').length
          return (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className={cn(
                'shrink-0 flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs border transition-all',
                selectedDate === d ? 'border-brand-primary bg-brand-primary/10' : 'border-white/10 hover:border-white/20',
              )}
            >
              <span className={selectedDate === d ? 'text-brand-primary font-semibold' : 'text-white/50'}>{formatDate(d)}</span>
              {count > 0 && (
                <span className="bg-brand-primary/20 text-brand-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Calendar size={40} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/40">No hay citas {selectedDate ? 'para esta fecha' : 'pendientes'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-2xl border bg-surface-1 overflow-hidden transition-all',
                a.status === 'scheduled' ? 'border-blue-500/10' : 'border-white/5',
              )}
            >
              {/* Header */}
              <div className="p-5 flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary/30 to-brand-primary/10 text-sm font-bold text-brand-primary">
                    {a.athleteName.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{a.athleteName}</p>
                      <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-semibold border', STATUS_STYLE[a.status])}>
                        {STATUS_LABEL[a.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-white/40">
                        <Calendar size={12} /> {formatDate(a.date)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-white/40">
                        <Clock size={12} /> {a.startTime} — {a.endTime}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-white/40">
                        {a.athleteModality === 'virtual' ? <Video size={12} /> : <MapPin size={12} />}
                        {a.athleteModality === 'presencial' ? 'Presencial' : a.athleteModality === 'hibrido' ? 'Hibrido' : 'Virtual'}
                      </span>
                    </div>
                  </div>
                </div>
                {a.status === 'scheduled' && (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      onClick={() => handleComplete(a.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors"
                    >
                      <CheckCircle2 size={13} /> Aprobar
                    </button>
                    <button
                      onClick={() => openReschedule(a)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors"
                    >
                      <CalendarClock size={13} /> Reprogramar
                    </button>
                    <button
                      onClick={() => { setCancelTarget(a); setCancelReason(a.notes || '') }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                    >
                      <XCircle size={13} /> Cancelar
                    </button>
                  </div>
                )}
              </div>

              {/* Athlete Onboarding Details (expandable) */}
              <button
                onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                className="w-full px-5 py-2 border-t border-white/5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-xs text-white/40 font-medium">Ver perfil del atleta</span>
                <span className="text-xs text-white/30">{expanded === a.id ? '▲' : '▼'}</span>
              </button>

              {expanded === a.id && (
                <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Deportes</p>
                      <div className="flex flex-wrap gap-1">
                        {a.athleteSports.map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary text-[10px] font-semibold">
                            {SPORT_LABELS[s] || s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Objetivo</p>
                      <p className="text-sm text-white/70">{a.athleteGoal}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Nivel</p>
                      <p className="text-sm text-white/70">{a.athleteLevel}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Equipamiento</p>
                      <p className="text-sm text-white/70">{a.athleteEquipment}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Frecuencia</p>
                      <p className="text-sm text-white/70">{a.athleteFrequency}x/semana · {a.athleteDuration}min</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Rutina</p>
                      <p className="text-sm text-white/70">{a.athleteRoutineAccepted ? 'Acepto rutina del sistema' : 'Quiere cita con coach'}</p>
                    </div>
                  </div>
                  {a.notes && (
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      <p className="text-xs text-white/50">{a.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Cancel Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !cancelLoading && setCancelTarget(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-surface-2 p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-white">Cancelar cita</h3>
            <p className="text-xs text-white/40 mt-1">¿Seguro que deseas cancelar la cita de <span className="text-white/70 font-medium">{cancelTarget.athleteName}</span> el {formatDate(cancelTarget.date)} {cancelTarget.startTime}?</p>
            <div className="mt-4 space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-white/50">Motivo de cancelación</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Opcional pero recomendado para emergencias..."
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-primary/50"
              />
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelLoading}
                className="px-4 py-2 rounded-lg border border-white/10 text-xs font-medium text-white/60 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40"
              >
                Volver
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelLoading}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                {cancelLoading ? 'Cancelando...' : <><XCircle size={14} /> Confirmar cancelación</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !resLoading && setRescheduleTarget(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-surface-2 p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-white">Reprogramar cita</h3>
            <p className="text-xs text-white/40 mt-1">Cita de <span className="text-white/70 font-medium">{rescheduleTarget.athleteName}</span> — selecciona nueva fecha y horario.</p>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-medium uppercase tracking-wider text-white/50">Fecha</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {next14Days.map((d) => (
                    <button
                      key={d}
                      onClick={() => setResDate(d)}
                      className={cn(
                        'px-2 py-2 rounded-lg text-[11px] font-medium border transition-all',
                        resDate === d ? 'border-brand-primary bg-brand-primary/15 text-brand-primary' : 'border-white/10 text-white/40 hover:border-white/20'
                      )}
                    >
                      {formatDate(d)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-white/50">Inicio</label>
                  <select
                    value={resStart}
                    onChange={(e) => setResStart(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary/50"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t} className="bg-surface-2 text-white">{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-white/50">Fin</label>
                  <select
                    value={resEnd}
                    onChange={(e) => setResEnd(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary/50"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t} className="bg-surface-2 text-white">{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-medium uppercase tracking-wider text-white/50">Notas (opcional)</label>
                <textarea
                  value={resNotes}
                  onChange={(e) => setResNotes(e.target.value)}
                  placeholder="Motivo o notas para la reprogramación..."
                  rows={2}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-primary/50"
                />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setRescheduleTarget(null)}
                disabled={resLoading}
                className="px-4 py-2 rounded-lg border border-white/10 text-xs font-medium text-white/60 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40"
              >
                Volver
              </button>
              <button
                onClick={handleRescheduleConfirm}
                disabled={resLoading}
                className="px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-medium hover:bg-brand-primary-hover transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                {resLoading ? 'Reprogramando...' : <><CalendarClock size={14} /> Confirmar reprogramación</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coach Availability Setup */}
      <AvailabilityEditor />
    </div>
  )
}

const DAYS = [
  { key: 1, label: 'Lun' },
  { key: 2, label: 'Mar' },
  { key: 3, label: 'Mie' },
  { key: 4, label: 'Jue' },
  { key: 5, label: 'Vie' },
  { key: 6, label: 'Sab' },
  { key: 0, label: 'Dom' },
]

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
]

type DaySchedule = { dayOfWeek: number; startTime: string; endTime: string }

function AvailabilityEditor() {
  const [schedules, setSchedules] = useState<DaySchedule[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/coaching/coach-availability')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSchedules(data) })
      .catch(() => { toast.error('Error al cargar disponibilidad') })
  }, [])

  const addSlot = (dayOfWeek: number) => {
    setSchedules((prev) => [...prev, { dayOfWeek, startTime: '07:00', endTime: '08:00' }])
  }

  const removeSlot = (index: number) => {
    setSchedules((prev) => prev.filter((_, i) => i !== index))
  }

  const updateSlot = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setSchedules((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const resp = await fetch('/api/coaching/coach-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedules),
      })
      if (!resp.ok) throw new Error('failed')
      toast.success('Disponibilidad guardada')
    } catch {
      toast.error('Error al guardar disponibilidad')
    } finally { setSaving(false) }
  }

  const slotsByDay = (day: number) => schedules.filter((s) => s.dayOfWeek === day)

  return (
    <div className="rounded-2xl border border-white/5 bg-surface-1 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white/80">Tu Disponibilidad</h2>
          <p className="text-xs text-white/40 mt-1">Configura los dias y horarios en que puedes atender citas.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all',
            'bg-brand-primary text-white hover:bg-brand-primary-hover disabled:opacity-40',
          )}
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DAYS.map((day) => {
          const daySlots = slotsByDay(day.key)
          return (
            <div key={day.key} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-white/60">{day.label}</p>
                <button
                  onClick={() => addSlot(day.key)}
                  className="flex items-center gap-1 text-[11px] text-brand-primary hover:text-brand-primary-hover transition-colors"
                >
                  <Plus size={12} /> Agregar
                </button>
              </div>
              {daySlots.length === 0 ? (
                <p className="text-[11px] text-white/20 italic">No disponible</p>
              ) : (
                <div className="space-y-2">
                  {daySlots.map((slot, idx) => {
                    const globalIdx = schedules.indexOf(slot)
                    return (
                      <div key={globalIdx} className="flex items-center gap-1.5">
                        <select
                          value={slot.startTime}
                          onChange={(e) => updateSlot(globalIdx, 'startTime', e.target.value)}
                          className="flex-1 rounded-md bg-white/[0.03] border border-white/10 px-2 py-1.5 text-[11px] text-white/70 focus:outline-none focus:border-brand-primary/50"
                        >
                          {TIME_SLOTS.map((t) => (
                            <option key={t} value={t} className="bg-surface-2 text-white">{t}</option>
                          ))}
                        </select>
                        <span className="text-[10px] text-white/20">—</span>
                        <select
                          value={slot.endTime}
                          onChange={(e) => updateSlot(globalIdx, 'endTime', e.target.value)}
                          className="flex-1 rounded-md bg-white/[0.03] border border-white/10 px-2 py-1.5 text-[11px] text-white/70 focus:outline-none focus:border-brand-primary/50"
                        >
                          {TIME_SLOTS.map((t) => (
                            <option key={t} value={t} className="bg-surface-2 text-white">{t}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeSlot(globalIdx)}
                          className="text-white/20 hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
