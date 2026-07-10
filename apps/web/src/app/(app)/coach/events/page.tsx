'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, MapPin, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MOCK_EVENTS } from '@/features/coach/data/_mocks'

const TYPE_LABELS: Record<string, string> = {
  competition: 'Competencia',
  meeting: 'Reunión',
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

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programado',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-amber-500/10 text-amber-400',
  confirmed: 'bg-green-500/10 text-green-400',
  completed: 'bg-blue-500/10 text-blue-400',
  cancelled: 'bg-red-500/10 text-red-400',
}

export default function CoachEventsPage() {
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all'
    ? MOCK_EVENTS
    : MOCK_EVENTS.filter((e) => e.type === filter)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Eventos</h1>
          <p className="text-sm text-white/40 mt-1">Calendario de competencias, reuniones y evaluaciones</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors">
          <Plus size={16} />
          Nuevo Evento
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { label: 'Todos', value: 'all' },
          { label: 'Competencias', value: 'competition' },
          { label: 'Reuniones', value: 'reunion' },
          { label: 'Evaluaciones', value: 'evaluacion' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              filter === f.value
                ? 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary'
                : 'border-white/10 text-white/40 hover:border-white/20',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-white/5 bg-surface-1 p-4 hover:border-white/10 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="text-center min-w-[48px]">
                  <p className="text-lg font-bold text-white font-display leading-none">
                    {event.date.split('-')[2]}
                  </p>
                  <p className="text-[10px] text-white/40 mt-0.5 uppercase">
                    {['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][parseInt(event.date.split('-')[1])]}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{event.title}</h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    {event.time} - {event.endTime}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-medium',
                      TYPE_COLORS[event.type],
                    )}>
                      {TYPE_LABELS[event.type]}
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-medium',
                      event.modality === 'presencial' ? 'bg-green-500/10 text-green-400' :
                      event.modality === 'virtual' ? 'bg-blue-500/10 text-blue-400' :
                      event.modality === 'hibrido' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-amber-500/10 text-amber-400',
                    )}>
                      {event.modality}
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-medium',
                      STATUS_COLORS[event.status],
                    )}>
                      {STATUS_LABELS[event.status]}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/30">
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
          </motion.div>
        ))}
      </div>
    </div>
  )
}
