'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, Check, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/features/shared/api/client'

type Appointment = {
  id: string; athleteId: string; athleteName: string; date: string; startTime: string; endTime: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  athleteSports: string[]; athleteModality: string; athleteLevel: string; athleteGoal: string
  athleteFrequency: number; athleteDuration: number; athleteEquipment: string; athleteRoutineAccepted: boolean; notes: string
}
type DaySchedule = { dayOfWeek: number; startTime: string; endTime: string }

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  rescheduled: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}
const STATUS_LABEL: Record<string, string> = { scheduled: 'Agendada', completed: 'Completada', cancelled: 'Cancelada', rescheduled: 'Reprogramada' }

function getInitials(n: string) { return n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2) }
function formatTime(t: string) { const [h, m] = t.split(':'); const hr = parseInt(h, 10); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}` }
function formatDateShort(d: string) { return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }) }
function getWeekInfo(offset: number) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const day = today.getDay(); const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today); monday.setDate(diff + offset * 7)
  const days: Date[] = []; for (let i = 0; i < 7; i++) { const d = new Date(monday); d.setDate(monday.getDate() + i); days.push(d) }
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  return { monday, sunday, days }
}
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }
function toDateString(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function modalityLabel(m: string) { return m === 'presencial' ? 'Presencial' : m === 'hibrido' ? 'Hibrido' : 'Virtual' }

function SkeletonCard() {
  return <div className="bg-surface-2 rounded-xl border border-white/5 p-4 animate-pulse space-y-3"><div className="flex gap-3"><div className="w-10 h-10 rounded-xl bg-white/5 shrink-0" /><div className="flex-1 space-y-2"><div className="h-4 w-36 bg-white/5 rounded" /><div className="h-3 w-48 bg-white/5 rounded" /></div></div></div>
}

function AppointmentCard({ appointment: a, index, onAction, actionLoading }: { appointment: Appointment; index: number; onAction: (id: string, s: 'completed' | 'cancelled') => void; actionLoading: string | null }) {
  const pending = a.status === 'scheduled'
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: index * 0.04 }} layout className={cn('rounded-xl border bg-surface-2 p-4 space-y-3', pending ? 'border-blue-500/10' : 'border-white/5')}>
      <div className="flex items-start gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary/30 to-brand-primary/10 text-xs font-bold text-brand-primary">{getInitials(a.athleteName)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white truncate">{a.athleteName}</p>
            <span className={cn('shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold border', STATUS_STYLE[a.status] ?? 'bg-white/5 text-white/40 border-white/10')}>{STATUS_LABEL[a.status] ?? a.status}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-white/40"><Clock className="w-3.5 h-3.5" />{formatTime(a.startTime)} — {formatTime(a.endTime)}</span>
            <span className="flex items-center gap-1 text-xs text-white/40"><Users className="w-3.5 h-3.5" />{modalityLabel(a.athleteModality)}</span>
          </div>
          {a.athleteSports?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{a.athleteSports.slice(0, 4).map(s => <span key={s} className="px-1.5 py-0.5 rounded-md bg-white/5 text-white/40 text-[10px] font-medium">{s}</span>)}</div>}
        </div>
      </div>
      {pending && (
        <div className="flex items-center gap-2 pt-1">
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => onAction(a.id, 'completed')} disabled={actionLoading === a.id} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-green-500/10 hover:bg-green-500/20 disabled:opacity-50 text-green-400 text-xs font-semibold rounded-lg transition-colors border border-green-500/10">
            <CheckCircle2 className="w-3.5 h-3.5" />{actionLoading === a.id ? 'Guardando...' : 'Aprobar'}
          </motion.button>
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => onAction(a.id, 'cancelled')} disabled={actionLoading === a.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 transition-colors border border-red-500/10">
            <XCircle className="w-3.5 h-3.5" />Cancelar
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}

export default function ScheduleView() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [availability, setAvailability] = useState<DaySchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const todayRef = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const weekInfo = useMemo(() => getWeekInfo(weekOffset), [weekOffset])

  const normalizeAppointments = useCallback((j: unknown): Appointment[] => {
    if (Array.isArray(j)) return j as Appointment[]
    if (j && typeof j === 'object') { const o = j as Record<string, unknown>; if (Array.isArray(o.appointments)) return o.appointments as Appointment[]; if (Array.isArray(o.data)) return o.data as Appointment[] }
    return []
  }, [])
  const normalizeAvailability = useCallback((j: unknown): DaySchedule[] => {
    if (Array.isArray(j)) return j as DaySchedule[]
    if (j && typeof j === 'object') { const o = j as Record<string, unknown>; if (Array.isArray(o.availability)) return o.availability as DaySchedule[]; if (Array.isArray(o.data)) return o.data as DaySchedule[] }
    return []
  }, [])

  const fetchAppointments = useCallback(async () => {
    try { const j = await api.get('/api/coaching/appointments'); setAppointments(normalizeAppointments(j)) } catch { /* keep */ }
  }, [normalizeAppointments])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      try {
        const [aJson, vJson] = await Promise.all([api.get('/api/coaching/appointments'), api.get('/api/coaching/coach-availability')])
        if (cancelled) return
        setAppointments(normalizeAppointments(aJson)); setAvailability(normalizeAvailability(vJson))
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar la agenda') }
      finally { if (!cancelled) setLoading(false) }
    }
    load(); return () => { cancelled = true }
  }, [normalizeAppointments, normalizeAvailability])

  const handleAction = useCallback(async (id: string, status: 'completed' | 'cancelled') => {
    setActionLoading(id)
    try {
      await api.put('/api/coaching/appointments', { id, status })
      await fetchAppointments(); setSuccessMsg(status === 'completed' ? 'Cita aprobada' : 'Cita cancelada'); setTimeout(() => setSuccessMsg(null), 2500)
    } catch { setSuccessMsg('Error al actualizar la cita'); setTimeout(() => setSuccessMsg(null), 2500) }
    finally { setActionLoading(null) }
  }, [fetchAppointments])

  const daysWithData = useMemo(() => weekInfo.days.map(day => {
    const dateStr = toDateString(day)
    return { date: day, dateStr, dayAppointments: appointments.filter(a => a.date === dateStr), dayAvail: availability.filter(s => s.dayOfWeek === day.getDay()) }
  }), [weekInfo.days, appointments, availability])

  const weekDateSet = useMemo(() => new Set(weekInfo.days.map(toDateString)), [weekInfo.days])
  const weekAppointments = useMemo(() => appointments.filter(a => weekDateSet.has(a.date)), [appointments, weekDateSet])
  const groupedByDay = useMemo(() => {
    const g: Record<string, Appointment[]> = {}
    for (const a of weekAppointments) { if (!g[a.date]) g[a.date] = []; g[a.date].push(a) }
    for (const k of Object.keys(g)) g[k].sort((x, y) => x.startTime.localeCompare(y.startTime))
    return g
  }, [weekAppointments])
  const sortedWeekDates = useMemo(() => Object.keys(groupedByDay).sort(), [groupedByDay])
  const pendingCount = useMemo(() => appointments.filter(a => a.status === 'scheduled').length, [appointments])
  const weekLabel = `Semana del ${weekInfo.monday.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`

  if (error) return <div className="p-6 max-w-6xl mx-auto"><div className="flex flex-col items-center justify-center py-20 text-center"><AlertTriangle className="w-10 h-10 text-red-400 mb-3" /><p className="text-red-400 text-sm font-medium">{error}</p><p className="text-xs text-white/40 mt-1">Intenta recargar la pagina.</p></div></div>
  if (loading) return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between"><div className="h-7 w-56 bg-white/5 rounded animate-pulse" /><div className="flex gap-2"><div className="h-7 w-7 bg-white/5 rounded-lg animate-pulse" /><div className="h-7 w-7 bg-white/5 rounded-lg animate-pulse" /></div></div>
      <div className="flex gap-2">{Array.from({ length: 7 }).map((_, i) => <div key={i} className="flex-1 h-20 bg-white/5 rounded-xl animate-pulse" />)}</div>
      {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 relative min-h-[calc(100vh-12rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold text-white font-display">Agenda</h1><p className="text-sm text-white/40 mt-0.5">{pendingCount} citas pendientes • {availability.length} franjas de disponibilidad</p></div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/coach/agendamiento" className="text-xs font-medium text-brand-primary hover:text-brand-primary-hover transition-colors px-3 py-1.5 rounded-lg border border-brand-primary/20 hover:border-brand-primary/30 bg-brand-primary/5">Gestionar disponibilidad →</Link>
          <span className="hidden sm:inline text-sm font-medium text-white/60 ml-1">{weekLabel}</span>
          <div className="flex items-center gap-1">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg bg-surface-2 border border-white/5 hover:bg-surface-3 text-white/40 hover:text-white/70 transition-colors" aria-label="Semana anterior"><ChevronLeft className="w-4 h-4" /></motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setWeekOffset(0)} className="px-2 py-1.5 rounded-lg text-[11px] font-medium text-white/40 hover:text-white/70 bg-surface-2 border border-white/5 hover:bg-surface-3 transition-colors">Hoy</motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg bg-surface-2 border border-white/5 hover:bg-surface-3 text-white/40 hover:text-white/70 transition-colors" aria-label="Semana siguiente"><ChevronRight className="w-4 h-4" /></motion.button>
          </div>
        </div>
      </div>
      <p className="sm:hidden text-xs font-medium text-white/40 -mt-2">{weekLabel}</p>

      <div className="flex gap-2">
        {daysWithData.map(({ date, dateStr, dayAppointments, dayAvail }) => {
          const isToday = isSameDay(date, todayRef); const hasAvail = dayAvail.length > 0; const count = dayAppointments.length
          return (
            <div key={dateStr} className={cn('flex-1 rounded-xl border p-3 flex flex-col items-center', isToday ? 'bg-brand-primary/5 border-brand-primary/20' : 'bg-surface-1 border-white/5')}>
              <div className={cn('text-[11px] font-medium', isToday ? 'text-brand-primary' : 'text-white/40')}>{DAY_LABELS[date.getDay() === 0 ? 6 : date.getDay() - 1]}</div>
              <div className={cn('text-lg font-bold mt-0.5', isToday ? 'text-brand-primary' : 'text-white/80')}>{date.getDate()}</div>
              {count > 0 ? <span className={cn('mt-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold', isToday ? 'bg-brand-primary text-white' : 'bg-orange-500 text-white')}>{count}</span> : <div className="mt-1.5 h-5" />}
              <div className="mt-1.5 h-1 flex justify-center">{hasAvail && <span className={cn('inline-block w-6 h-1 rounded-full', isToday ? 'bg-brand-primary/60' : 'bg-white/15')} title={`${dayAvail.length} franja(s)`} />}</div>
            </div>
          )
        })}
      </div>

      {appointments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4"><Calendar className="w-6 h-6 text-white/30" /></div>
          <p className="text-base font-medium text-white/80">No hay citas agendadas</p>
          <p className="text-sm text-white/40 mt-1 max-w-xs">Cuando un atleta agende una cita desde la app aparecera aqui. Configura tu disponibilidad para comenzar.</p>
          <Link href="/coach/agendamiento" className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold rounded-lg transition-colors"><Calendar className="w-4 h-4" />Configurar disponibilidad</Link>
        </div>
      )}
      {appointments.length > 0 && weekAppointments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="w-8 h-8 text-white/20 mb-3" /><p className="text-sm text-white/40">No hay citas esta semana</p>
          <p className="text-xs text-white/30 mt-1">Prueba navegando a otra semana o revisa todas en</p>
          <Link href="/coach/agendamiento" className="text-xs text-brand-primary hover:underline mt-1">Agendamiento →</Link>
        </div>
      )}
      {weekAppointments.length > 0 && (
        <div className="space-y-6">
          {sortedWeekDates.map(dateStr => (
            <div key={dateStr}>
              <h3 className="text-sm font-semibold text-white/60 mb-3 capitalize">{formatDateShort(dateStr)}</h3>
              <div className="space-y-3">{groupedByDay[dateStr].map((appt, i) => <AppointmentCard key={appt.id} appointment={appt} index={i} onAction={handleAction} actionLoading={actionLoading} />)}</div>
            </div>
          ))}
        </div>
      )}
      <AnimatePresence>{successMsg && <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-400"><Check className="w-4 h-4" />{successMsg}</motion.div>}</AnimatePresence>
    </div>
  )
}
