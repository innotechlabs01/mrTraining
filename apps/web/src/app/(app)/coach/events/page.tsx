'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, MapPin, Users, Pencil, ListChecks, FileText, Footprints } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CoachEvent, EventFormat } from '@/features/coach/types'
import { useEvents } from '@/features/coach/hooks/useEvents'
import { EventModal } from '@/features/coach/components/events/EventModal'
import { EventDetailModal } from '@/features/coach/components/events/EventDetailModal'

const TYPE_LABELS: Record<string, string> = {
  competition: 'Competencia',
  meeting: 'Meeting',
  reunion: 'Reunión',
  evaluacion: 'Evaluación',
  other: 'Otro',
}
const TYPE_COLORS: Record<string, string> = {
  competition: 'bg-red-500/10 text-red-400',
  meeting: 'bg-blue-500/10 text-blue-400',
  reunion: 'bg-blue-500/10 text-blue-400',
  evaluacion: 'bg-purple-500/10 text-purple-400',
  other: 'bg-white/10 text-white/50',
}
const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-amber-500/10 text-amber-400',
  confirmed: 'bg-green-500/10 text-green-400',
  completed: 'bg-blue-500/10 text-blue-400',
  cancelled: 'bg-red-500/10 text-red-400',
}
const FORMAT_META: Record<EventFormat, { label: string; icon: typeof ListChecks; color: string; accent: string }> = {
  lista: { label: 'Lista', icon: ListChecks, color: 'bg-cyan-500/10 text-cyan-400', accent: 'border-l-cyan-500/40' },
  formulario: { label: 'Formulario', icon: FileText, color: 'bg-violet-500/10 text-violet-400', accent: 'border-l-violet-500/40' },
  running: { label: 'Running', icon: Footprints, color: 'bg-amber-500/10 text-amber-400', accent: 'border-l-amber-500/40' },
}
const MONTHS = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const TYPE_FILTERS = [
  { label: 'Todos', value: 'all' },
  { label: 'Competencias', value: 'competition' },
  { label: 'Reuniones', value: 'reunion' },
  { label: 'Evaluaciones', value: 'evaluacion' },
]
const FORMAT_FILTERS: { label: string; value: EventFormat | 'all' }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Lista', value: 'lista' },
  { label: 'Formulario', value: 'formulario' },
  { label: 'Running', value: 'running' },
]

export default function CoachEventsPage() {
  const { events, upsertEvent, deleteEvent } = useEvents()
  const [typeFilter, setTypeFilter] = useState('all')
  const [formatFilter, setFormatFilter] = useState<EventFormat | 'all'>('all')
  const [editing, setEditing] = useState<CoachEvent | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [detail, setDetail] = useState<CoachEvent | null>(null)

  const filtered = events.filter(
    (e) => (typeFilter === 'all' || e.type === typeFilter) && (formatFilter === 'all' || (e.format ?? 'lista') === formatFilter),
  )

  const handleSave = (event: CoachEvent) => {
    upsertEvent(event)
    setEditing(null)
    setShowNew(false)
  }

  const handleTogglePublic = (id: string) => {
    const ev = events.find((e) => e.id === id)
    if (!ev) return
    const updated = { ...ev, public: !ev.public }
    upsertEvent(updated)
    setDetail(updated)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Eventos</h1>
          <p className="text-sm text-white/40 mt-1">Crea eventos y define cómo se registran los participantes</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors"
        >
          <Plus size={16} />
          Nuevo Evento
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                typeFilter === f.value ? 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary' : 'border-white/10 text-white/40 hover:border-white/20',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FORMAT_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFormatFilter(f.value)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                formatFilter === f.value ? 'border-white/30 bg-white/10 text-white' : 'border-white/5 text-white/30 hover:border-white/15',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((event, i) => {
          const fmt = FORMAT_META[event.format ?? 'lista']
          const Icon = fmt.icon
          const [y, m, d] = event.date.split('-')
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setDetail(event)}
              className={cn(
                'relative rounded-2xl border border-white/5 bg-surface-1 p-4 pl-5 hover:border-white/10 transition-all cursor-pointer border-l-2',
                fmt.accent,
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="text-center min-w-[48px]">
                    <p className="text-lg font-bold text-white font-display leading-none">{d}</p>
                    <p className="text-[10px] text-white/40 mt-0.5 uppercase">{MONTHS[parseInt(m)]}</p>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{event.title}</h3>
                    <p className="text-xs text-white/40 mt-0.5">
                      {event.time} - {event.endTime}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', TYPE_COLORS[event.type])}>
                        {TYPE_LABELS[event.type]}
                      </span>
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium', fmt.color)}>
                        <Icon className="w-3 h-3" />
                        {fmt.label}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', STATUS_COLORS[event.status])}>
                        {event.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(event) }}
                    className="p-1.5 rounded-md text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Editar evento"
                  >
                    <Pencil size={14} />
                  </button>
                  <div className="flex flex-col items-end gap-1 text-xs text-white/30">
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {event.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {event.athleteIds.length}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-white/30 text-center py-10">No hay eventos con estos filtros.</p>
        )}
      </div>

      <EventModal open={!!editing || showNew} event={editing} onClose={() => { setEditing(null); setShowNew(false) }} onSave={handleSave} />
      {detail && (
        <EventDetailModal
          event={detail}
          onClose={() => setDetail(null)}
          onEdit={(e) => { setDetail(null); setEditing(e) }}
          onDelete={(id) => { deleteEvent(id); setDetail(null) }}
          onTogglePublic={handleTogglePublic}
        />
      )}
    </div>
  )
}
