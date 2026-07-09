'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Plus, Check, X, ChevronLeft, ChevronRight,
  Clock, Users, Send, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSchedule, useWorkoutPlans } from '@/features/workout'
import type { ScheduleEvent, ScheduleStatus } from '@/features/workout'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const STATUS_STYLES: Record<ScheduleStatus, string> = {
  draft: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  scheduled: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  published: 'text-green-400 bg-green-500/10 border-green-500/20',
  completed: 'text-white/40 bg-white/5 border-white/10',
  cancelled: 'text-red-400 bg-red-500/10 border-red-500/20',
}

const MOCK_ATHLETES = [
  { id: 'ath-1', name: 'Alex Chen' },
  { id: 'ath-2', name: 'Sarah Johnson' },
  { id: 'ath-3', name: 'James Thompson' },
  { id: 'ath-4', name: 'Emma Wilson' },
  { id: 'ath-5', name: 'Olivia Davis' },
  { id: 'ath-6', name: 'Liam Martinez' },
  { id: 'ath-7', name: 'Sophia Anderson' },
]

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

function formatTime(time: string) {
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getWeekInfo(offset: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today)
  monday.setDate(diff + offset * 7)

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(d)
  }

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return { monday, sunday, days }
}

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

function toDateString(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isToday(date: Date) {
  return isSameDay(date, new Date())
}

function SkeletonEventCard() {
  return (
    <div className="bg-surface-2 rounded-xl border border-white/5 p-4 animate-pulse space-y-3">
      <div className="h-5 w-48 bg-white/5 rounded" />
      <div className="h-3 w-32 bg-white/5 rounded" />
      <div className="flex gap-1.5">
        <div className="w-7 h-7 rounded-full bg-white/5" />
        <div className="w-7 h-7 rounded-full bg-white/5" />
      </div>
      <div className="flex gap-2 pt-1">
        <div className="h-7 w-20 bg-white/5 rounded-lg" />
        <div className="h-7 w-16 bg-white/5 rounded-lg" />
      </div>
    </div>
  )
}

function CreateEventModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<ScheduleEvent, 'id' | 'createdAt' | 'status'>) => Promise<void>
}) {
  const { plans } = useWorkoutPlans()

  const today = toDateString(new Date())

  const [form, setForm] = useState({
    date: today,
    startTime: '07:00',
    endTime: '08:00',
    workoutId: '',
    athleteIds: [] as string[],
    coachNotes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        date: today,
        startTime: '07:00',
        endTime: '08:00',
        workoutId: '',
        athleteIds: [],
        coachNotes: '',
      })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const toggleAthlete = (id: string) => {
    setForm(prev => ({
      ...prev,
      athleteIds: prev.athleteIds.includes(id)
        ? prev.athleteIds.filter(a => a !== id)
        : [...prev.athleteIds, id],
    }))
  }

  const selectedPlan = plans.find(p => p.id === form.workoutId)

  const handleSave = async () => {
    if (!form.workoutId || !form.date || !form.startTime || !form.endTime) return
    if (!selectedPlan) return
    setSaving(true)
    await onSave({
      workoutId: form.workoutId,
      workoutName: selectedPlan.name,
      athleteIds: form.athleteIds,
      athleteNames: form.athleteIds.map(id => MOCK_ATHLETES.find(a => a.id === id)?.name ?? ''),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      coachNotes: form.coachNotes.trim() || undefined,
    })
    setSaving(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg bg-surface-1 rounded-2xl border border-white/10 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
              <h3 className="text-lg font-semibold text-white font-display">Schedule Session</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full bg-surface-3 border border-white/10 rounded-lg p-2.5 text-sm text-white outline-none focus:border-orange-500/50 transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Start Time</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                    className="w-full bg-surface-3 border border-white/10 rounded-lg p-2.5 text-sm text-white outline-none focus:border-orange-500/50 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">End Time</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                    className="w-full bg-surface-3 border border-white/10 rounded-lg p-2.5 text-sm text-white outline-none focus:border-orange-500/50 transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Workout</label>
                <select
                  value={form.workoutId}
                  onChange={e => setForm(p => ({ ...p, workoutId: e.target.value }))}
                  className="w-full bg-surface-3 border border-white/10 rounded-lg p-2.5 text-sm text-white outline-none focus:border-orange-500/50 transition-colors"
                >
                  <option value="">Select a workout...</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Athletes <span className="text-white/30">({form.athleteIds.length} selected)</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {MOCK_ATHLETES.map(athlete => {
                    const selected = form.athleteIds.includes(athlete.id)
                    return (
                      <label
                        key={athlete.id}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors',
                          selected
                            ? 'bg-orange-500/10 border border-orange-500/30'
                            : 'bg-white/5 border border-transparent hover:bg-white/10',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleAthlete(athlete.id)}
                          className="sr-only"
                        />
                        <div className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                          selected
                            ? 'bg-orange-500 border-orange-500'
                            : 'bg-surface-3 border-white/20',
                        )}>
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={selected ? 'text-white' : 'text-white/60'}>{athlete.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Coach Notes <span className="text-white/30">(optional)</span>
                </label>
                <textarea
                  value={form.coachNotes}
                  onChange={e => setForm(p => ({ ...p, coachNotes: e.target.value }))}
                  placeholder="Any instructions or notes for this session..."
                  rows={2}
                  className="w-full bg-surface-3 border border-white/10 rounded-lg p-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-orange-500/50 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-white/5 shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white/60 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.workoutId || !form.date || !form.startTime || !form.endTime || saving}
                className={cn(
                  'px-5 py-2 rounded-lg text-sm font-semibold transition-colors',
                  form.workoutId && !saving
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-white/5 text-white/30 cursor-not-allowed',
                )}
              >
                {saving ? 'Scheduling...' : 'Schedule Session'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function EventCard({
  event,
  index,
  onPublish,
  onCancel,
  publishLoading,
}: {
  event: ScheduleEvent
  index: number
  onPublish: (id: string) => void
  onCancel: (id: string) => void
  publishLoading: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      layout
    >
      <div className="bg-surface-2 rounded-xl border border-white/5 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-base font-semibold text-white">{event.workoutName}</h4>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1 text-xs text-white/40">
                <Clock className="w-3.5 h-3.5" />
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
              </div>
              <div className="flex items-center gap-1 text-xs text-white/40">
                <Users className="w-3.5 h-3.5" />
                {event.athleteNames.length}
              </div>
            </div>
          </div>
          <span
            className={cn(
              'shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-medium border capitalize',
              STATUS_STYLES[event.status],
            )}
          >
            {event.status}
          </span>
        </div>

        {event.athleteNames.length > 0 && (
          <div className="flex items-center gap-1.5">
            {event.athleteNames.slice(0, 5).map(name => (
              <div
                key={name}
                title={name}
                className="w-7 h-7 rounded-full bg-surface-3 border border-white/10 flex items-center justify-center"
              >
                <span className="text-[10px] font-medium text-white/60">{getInitials(name)}</span>
              </div>
            ))}
            {event.athleteNames.length > 5 && (
              <span className="text-[10px] text-white/40">+{event.athleteNames.length - 5}</span>
            )}
          </div>
        )}

        {event.coachNotes && (
          <p className="text-xs text-white/40 italic leading-relaxed">{event.coachNotes}</p>
        )}

        {(event.status === 'draft' || event.status === 'scheduled') && (
          <div className="flex items-center gap-2 pt-1">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onPublish(event.id)}
              disabled={publishLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {publishLoading ? 'Publishing...' : 'Publish'}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onCancel(event.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancel Session
            </motion.button>
          </div>
        )}

        {event.status === 'published' && (
          <div className="flex items-center gap-1.5 text-xs text-green-400/60">
            <Check className="w-3.5 h-3.5" />
            Published to athletes
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function ScheduleView() {
  const { events, loading, error, createEvent, publishEvent, cancelEvent } = useSchedule()
  const { plans, loading: plansLoading } = useWorkoutPlans()

  const todayRef = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [weekOffset, setWeekOffset] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [publishLoading, setPublishLoading] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const weekInfo = useMemo(() => getWeekInfo(weekOffset), [weekOffset])

  const weekEvents = useMemo(() => {
    return events.filter(e => {
      const eventDate = new Date(e.date + 'T12:00:00')
      return eventDate >= weekInfo.monday && eventDate <= weekInfo.sunday
    })
  }, [events, weekInfo])

  const eventsByDay = useMemo(() => {
    const grouped: Record<string, ScheduleEvent[]> = {}
    for (const event of weekEvents) {
      if (!grouped[event.date]) grouped[event.date] = []
      grouped[event.date].push(event)
    }
    return grouped
  }, [weekEvents])

  const daysWithEvents = useMemo(() => {
    return weekInfo.days.map(day => {
      const dateStr = toDateString(day)
      return {
        date: day,
        dateStr,
        events: eventsByDay[dateStr] ?? [],
      }
    })
  }, [weekInfo, eventsByDay])

  const handleCreateEvent = useCallback(async (data: Omit<ScheduleEvent, 'id' | 'createdAt' | 'status'>) => {
    await createEvent(data)
  }, [createEvent])

  const handlePublish = useCallback(async (id: string) => {
    setPublishLoading(id)
    await publishEvent(id)
    setPublishLoading(null)
    setSuccessMsg('Session published successfully!')
    setTimeout(() => setSuccessMsg(null), 2000)
  }, [publishEvent])

  const handleCancel = useCallback(async (id: string) => {
    await cancelEvent(id)
  }, [cancelEvent])

  const weekLabel = `Week of ${weekInfo.monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
          <p className="text-red-400 text-sm font-medium">{error}</p>
          <p className="text-xs text-white/40 mt-1">Try refreshing the page.</p>
        </div>
      </div>
    )
  }

  if (loading || plansLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="h-7 w-56 bg-white/5 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-7 w-7 bg-white/5 rounded-lg animate-pulse" />
            <div className="h-7 w-7 bg-white/5 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 h-16 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonEventCard key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 relative min-h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white font-display">Schedule</h1>
          <p className="text-sm text-white/40 mt-0.5">{events.length} session{events.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white/60">{weekLabel}</span>
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setWeekOffset(o => o - 1)}
              className="p-1.5 rounded-lg bg-surface-2 border border-white/5 hover:bg-surface-3 text-white/40 hover:text-white/70 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setWeekOffset(0)}
              className="px-2 py-1.5 rounded-lg text-[11px] font-medium text-white/40 hover:text-white/70 bg-surface-2 border border-white/5 hover:bg-surface-3 transition-colors"
            >
              Today
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setWeekOffset(o => o + 1)}
              className="p-1.5 rounded-lg bg-surface-2 border border-white/5 hover:bg-surface-3 text-white/40 hover:text-white/70 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {daysWithEvents.map(({ date, dateStr, events: dayEvents }) => {
          const isCurrentDay = isSameDay(date, todayRef)
          return (
            <div
              key={dateStr}
              className={cn(
                'flex-1 rounded-xl border p-3 transition-colors',
                isCurrentDay
                  ? 'bg-orange-500/5 border-orange-500/20'
                  : 'bg-surface-1 border-white/5',
              )}
            >
              <div className="text-center">
                <div className={cn(
                  'text-[11px] font-medium',
                  isCurrentDay ? 'text-orange-400' : 'text-white/40',
                )}>
                  {DAY_LABELS[date.getDay() === 0 ? 6 : date.getDay() - 1]}
                </div>
                <div className={cn(
                  'text-lg font-bold mt-0.5',
                  isCurrentDay ? 'text-orange-400' : 'text-white/80',
                )}>
                  {date.getDate()}
                </div>
                {dayEvents.length > 0 && (
                  <div className="mt-1.5">
                    <div className={cn(
                      'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold',
                      isCurrentDay
                        ? 'bg-orange-500 text-white'
                        : 'bg-white/10 text-white/50',
                    )}>
                      {dayEvents.length}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-white/30" />
          </div>
          <p className="text-base font-medium text-white/80">Schedule your first session</p>
          <p className="text-sm text-white/40 mt-1 max-w-xs">
            Create workout sessions, assign athletes, and publish them to their daily view
          </p>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setModalOpen(true)}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Schedule Session
          </motion.button>
        </div>
      )}

      {events.length > 0 && weekEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="w-8 h-8 text-white/20 mb-3" />
          <p className="text-sm text-white/40">No sessions scheduled for this week</p>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setModalOpen(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Schedule Session
          </motion.button>
        </div>
      )}

      {events.length > 0 && (
        <div className="space-y-6">
          {daysWithEvents.map(({ date, dateStr, events: dayEvents }) => {
            if (dayEvents.length === 0) return null
            return (
              <div key={dateStr}>
                <h3 className="text-sm font-semibold text-white/60 mb-3">
                  {formatDateShort(dateStr)}
                </h3>
                <div className="space-y-3">
                  {dayEvents.map((ev, i) => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      index={i}
                      onPublish={handlePublish}
                      onCancel={handleCancel}
                      publishLoading={publishLoading === ev.id}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setModalOpen(true)}
        className="fixed bottom-8 right-8 z-40 flex items-center gap-2 px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-full shadow-lg shadow-orange-500/25 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Schedule Session
      </motion.button>

      <CreateEventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreateEvent}
      />

      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed bottom-24 right-8 z-50 flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-400"
          >
            <Check className="w-4 h-4" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
