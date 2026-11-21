'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Video,
  Plus,
  Trash2,
  Save,
  CalendarClock,
  Copy,
  Sparkles,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { goClient } from '@/lib/api/go-client'
import { WebRTCMeetRoom } from '@/features/coach/components/meet/WebRTCMeetRoom'
import { toast } from 'sonner'

type GoAppointment = {
  id: string
  coach_id: string
  athlete_id: string
  athlete_name?: string
  title: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | string
  start_time: string
  end_time: string
  notes?: string
  meet_room_id?: string
}

type Appointment = {
  id: string
  athleteId: string
  athleteName: string
  title: string
  date: string
  startTime: string
  endTime: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  notes: string
  meetRoomId: string
}

function splitDateTime(iso: string): { date: string; time: string } {
  if (!iso) return { date: '', time: '00:00' }
  const [datePart, timePart = ''] = iso.split('T')
  return {
    date: datePart.slice(0, 10),
    time: timePart.slice(0, 5) || '00:00',
  }
}

function mapAppointment(a: GoAppointment): Appointment {
  const start = splitDateTime(a.start_time)
  const end = splitDateTime(a.end_time)
  const rawStatus = a.status as Appointment['status']
  const status: Appointment['status'] = ['scheduled', 'completed', 'cancelled', 'rescheduled'].includes(rawStatus)
    ? rawStatus
    : 'scheduled'
  return {
    id: a.id,
    athleteId: a.athlete_id,
    athleteName: a.athlete_name || 'Nuevo Atleta',
    title: a.title || 'Meet de Onboarding & Rutina',
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    status,
    notes: a.notes ?? '',
    meetRoomId: a.meet_room_id || `meet-${a.id.slice(0, 12)}`,
  }
}

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  rescheduled: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Agendada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  rescheduled: 'Reprogramada',
}

export default function AgendamientoPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activeMeet, setActiveMeet] = useState<Appointment | null>(null)

  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)

  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null)
  const [resDate, setResDate] = useState<string>('')
  const [resStart, setResStart] = useState<string>('07:00')
  const [resEnd, setResEnd] = useState<string>('08:00')
  const [resNotes, setResNotes] = useState('')
  const [resLoading, setResLoading] = useState(false)

  const { data: appointments = [], isLoading: loading, refetch: fetchAppointments } = useQuery<Appointment[]>({
    queryKey: ['coaching', 'appointments'],
    queryFn: async () => {
      try {
        const resp = await goClient.get<{ data?: GoAppointment[] }>('/api/v1/coaches/appointments')
        return (resp?.data ?? []).map(mapAppointment)
      } catch {
        toast.error('Error al cargar citas del coach')
        return []
      }
    },
    staleTime: 20_000,
    retry: false,
  })

  const handleComplete = async (id: string) => {
    try {
      await goClient.put(`/api/v1/coaches/appointments/${id}`, { status: 'completed' })
      toast.success('Reunión marcada como completada')
      fetchAppointments()
    } catch {
      toast.error('Error al actualizar cita')
    }
  }

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return
    setCancelLoading(true)
    try {
      await goClient.put(`/api/v1/coaches/appointments/${cancelTarget.id}`, {
        status: 'cancelled',
        notes: cancelReason,
      })
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
      await goClient.put(`/api/v1/coaches/appointments/${rescheduleTarget.id}`, {
        status: 'rescheduled',
        start_time: `${resDate}T${resStart}`,
        end_time: `${resDate}T${resEnd}`,
        notes: resNotes || undefined,
      })
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
    setResNotes(a.notes)
  }

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const next14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  const todayMeetings = appointments.filter((a) => a.date === todayStr && a.status !== 'cancelled')
  const filtered = selectedDate
    ? appointments.filter((a) => a.date === selectedDate)
    : appointments.filter((a) => a.status !== 'cancelled')

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    const d = new Date(`${dateStr}T00:00:00`)
    return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const copyMeetLink = (roomId: string) => {
    const url = `${window.location.origin}/meet/${roomId}?role=athlete`
    navigator.clipboard.writeText(url)
    toast.success('Enlace Meet P2P copiado para enviar al atleta')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Agendamiento & Meet P2P</h1>
          <p className="text-sm text-white/40 mt-1">
            {appointments.filter((a) => a.status === 'scheduled').length} reuniones pendientes ·{' '}
            <span className="text-brand-primary font-medium">{todayMeetings.length} programadas para hoy</span>
          </p>
        </div>
        <button
          onClick={() => fetchAppointments()}
          className="p-2 rounded-lg border border-white/10 text-white/40 hover:text-white/70 transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Today Banner */}
      <div className="rounded-xl border border-brand-primary/25 bg-brand-primary/10 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-brand-primary/20 p-2.5 text-brand-primary">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {todayMeetings.length > 0
                ? `Tienes ${todayMeetings.length} ${todayMeetings.length === 1 ? 'reunión' : 'reuniones'} hoy para explicar rutinas`
                : 'Sin reuniones de onboarding programadas para hoy'}
            </p>
            <p className="text-xs text-white/50">
              Inicia la videollamada WebRTC P2P directa sin apps externas desde cada tarjeta agendada.
            </p>
          </div>
        </div>
        {todayMeetings[0] && (
          <button
            onClick={() => setActiveMeet(todayMeetings[0])}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-xs font-semibold text-white hover:bg-brand-primary/90 transition-colors"
          >
            <Video size={14} /> Entrar al próximo Meet ({todayMeetings[0].startTime})
          </button>
        )}
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
                'rounded-lg border bg-surface-1 overflow-hidden transition-all',
                a.status === 'scheduled' ? 'border-blue-500/20' : 'border-white/5',
              )}
            >
              <div className="p-5 flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary/30 to-brand-primary/10 text-sm font-bold text-brand-primary">
                    {a.athleteName.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || 'AT'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{a.athleteName}</p>
                      <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-semibold border', STATUS_STYLE[a.status])}>
                        {STATUS_LABEL[a.status]}
                      </span>
                      {a.date === todayStr && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                          Hoy
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/60 mt-0.5">{a.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-white/40">
                        <Calendar size={12} /> {formatDate(a.date)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-white/40">
                        <Clock size={12} /> {a.startTime} — {a.endTime}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-white/40 font-mono">
                        <Video size={12} /> {a.meetRoomId}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {a.status !== 'cancelled' && (
                    <>
                      <button
                        onClick={() => setActiveMeet(a)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary/90 transition-colors"
                      >
                        <Video size={13} /> Abrir Meet P2P
                      </button>
                      <button
                        onClick={() => copyMeetLink(a.meetRoomId)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/70 text-xs font-medium hover:bg-white/10 transition-colors"
                      >
                        <Copy size={13} /> Enlace
                      </button>
                    </>
                  )}
                  {(a.status === 'scheduled' || a.status === 'rescheduled') && (
                    <>
                      <button
                        onClick={() => handleComplete(a.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors"
                      >
                        <CheckCircle2 size={13} /> Completar
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
                    </>
                  )}
                </div>
              </div>

              {a.notes && (
                <>
                  <button
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                    className="w-full px-5 py-2 border-t border-white/5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-xs text-white/40 font-medium">Notas de la reunión</span>
                    <span className="text-xs text-white/30">{expanded === a.id ? '▲' : '▼'}</span>
                  </button>
                  {expanded === a.id && (
                    <div className="px-5 pb-4 pt-2 border-t border-white/5">
                      <p className="text-xs text-white/60">{a.notes}</p>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* WebRTC Meet Modal */}
      {activeMeet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl space-y-2">
            <div className="flex justify-end">
              <button
                onClick={() => setActiveMeet(null)}
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
              >
                <X size={14} /> Cerrar ventana
              </button>
            </div>
            <WebRTCMeetRoom
              roomId={activeMeet.meetRoomId}
              role="coach"
              title={activeMeet.title}
              participantName={activeMeet.athleteName}
              onClose={() => setActiveMeet(null)}
            />
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !cancelLoading && setCancelTarget(null)} />
          <div className="relative w-full max-w-md rounded-lg border border-white/10 bg-surface-2 p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-white">Cancelar cita</h3>
            <p className="text-xs text-white/40 mt-1">
              ¿Seguro que deseas cancelar la cita de <span className="text-white/70 font-medium">{cancelTarget.athleteName}</span> el {formatDate(cancelTarget.date)} {cancelTarget.startTime}?
            </p>
            <div className="mt-4 space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-white/50">Motivo de cancelación</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Opcional pero recomendado..."
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-primary/50"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelLoading}
                className="px-4 py-2 rounded-lg text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelLoading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {cancelLoading ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !resLoading && setRescheduleTarget(null)} />
          <div className="relative w-full max-w-md rounded-lg border border-white/10 bg-surface-2 p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-white">Reprogramar cita</h3>
            <p className="text-xs text-white/40 mt-1">
              Reprogramar cita de <span className="text-white/70 font-medium">{rescheduleTarget.athleteName}</span>
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-white/50">Nueva fecha</label>
                <input
                  type="date"
                  value={resDate}
                  min={todayStr}
                  onChange={(e) => setResDate(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-white/50">Inicio</label>
                  <select
                    value={resStart}
                    onChange={(e) => setResStart(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary/50"
                  >
                    {TIME_SLOTS.map((t) => <option key={t} value={t} className="bg-surface-2">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-white/50">Fin</label>
                  <select
                    value={resEnd}
                    onChange={(e) => setResEnd(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary/50"
                  >
                    {TIME_SLOTS.map((t) => <option key={t} value={t} className="bg-surface-2">{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-white/50">Nota (opcional)</label>
                <input
                  type="text"
                  value={resNotes}
                  onChange={(e) => setResNotes(e.target.value)}
                  placeholder="Ej: Ajuste de horario..."
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-primary/50"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setRescheduleTarget(null)}
                disabled={resLoading}
                className="px-4 py-2 rounded-lg text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                Cancelar
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
    goClient
      .get<{ data?: Array<{ day_of_week: number; start_time: string; end_time: string; is_active?: boolean }> }>(
        '/api/v1/coaches/availability',
      )
      .then((res) => {
        const list = res?.data ?? []
        setSchedules(
          list.map((s) => ({
            dayOfWeek: s.day_of_week,
            startTime: s.start_time,
            endTime: s.end_time,
          })),
        )
      })
      .catch(() => {
        toast.error('Error al cargar disponibilidad')
      })
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
      await goClient.post('/api/v1/coaches/availability', {
        slots: schedules.map((s) => ({
          day_of_week: s.dayOfWeek,
          start_time: s.startTime,
          end_time: s.endTime,
          is_active: true,
        })),
      })
      toast.success('Disponibilidad guardada en Go API')
    } catch {
      toast.error('Error al guardar disponibilidad')
    } finally {
      setSaving(false)
    }
  }

  const slotsByDay = (day: number) => schedules.filter((s) => s.dayOfWeek === day)

  return (
    <div className="rounded-lg border border-white/5 bg-surface-1 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white/80">Tu Disponibilidad (Onboarding)</h2>
          <p className="text-xs text-white/40 mt-1">Configura los días y horarios visibles para que nuevos atletas agenden su Meet P2P.</p>
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
                  {daySlots.map((slot) => {
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
