'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Dumbbell, Clock, Users, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TrainingMode } from '@/features/coach/types'

interface Program {
  id: string
  name: string
  description: string
  modality: TrainingMode
  duration: string
  sessionsPerWeek: number
  athleteCount: number
  isActive: boolean
}

const MOCK_PROGRAMS: Program[] = [
  {
    id: 'prog-1',
    name: 'Velocidad - Fase 2',
    description: 'Programa avanzado de velocidad con trabajo de starts y aceleración',
    modality: 'presencial',
    duration: '4 semanas',
    sessionsPerWeek: 3,
    athleteCount: 4,
    isActive: true,
  },
  {
    id: 'prog-2',
    name: 'Base Running - Maratón',
    description: 'Preparación base para maratón con volumen progresivo',
    modality: 'running',
    duration: '12 semanas',
    sessionsPerWeek: 5,
    athleteCount: 3,
    isActive: true,
  },
  {
    id: 'prog-3',
    name: 'Full Body HIIT',
    description: 'Circuito de alta intensidad combinando fuerza y cardio',
    modality: 'hibrido',
    duration: '6 semanas',
    sessionsPerWeek: 4,
    athleteCount: 7,
    isActive: true,
  },
  {
    id: 'prog-4',
    name: 'Técnica de nado',
    description: 'Corrección de técnica y drills específicos',
    modality: 'virtual',
    duration: '8 semanas',
    sessionsPerWeek: 3,
    athleteCount: 2,
    isActive: false,
  },
]

const MODALITY_FILTERS: { label: string; value: TrainingMode | 'all' }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Virtual', value: 'virtual' },
  { label: 'Presencial', value: 'presencial' },
  { label: 'Híbrido', value: 'hibrido' },
  { label: 'Running', value: 'running' },
]

export default function CoachProgramsPage() {
  const [filter, setFilter] = useState<TrainingMode | 'all'>('all')

  const filtered = filter === 'all'
    ? MOCK_PROGRAMS
    : MOCK_PROGRAMS.filter((p) => p.modality === filter)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Programas</h1>
          <p className="text-sm text-white/40 mt-1">{MOCK_PROGRAMS.length} programas creados</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors">
          <Plus size={16} />
          Nuevo Programa
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {MODALITY_FILTERS.map((f) => (
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((program, i) => (
          <motion.div
            key={program.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-white/5 bg-surface-1 p-5 hover:border-white/10 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">{program.name}</h3>
                <p className="text-xs text-white/40 mt-0.5">{program.description}</p>
              </div>
              <span className={cn(
                'shrink-0 px-2 py-0.5 rounded text-[10px] font-medium',
                program.modality === 'presencial' ? 'bg-green-500/10 text-green-400' :
                program.modality === 'virtual' ? 'bg-blue-500/10 text-blue-400' :
                program.modality === 'hibrido' ? 'bg-purple-500/10 text-purple-400' :
                'bg-amber-500/10 text-amber-400',
              )}>
                {program.modality}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-white/30">
              <span className="flex items-center gap-1"><Clock size={12} />{program.duration}</span>
              <span className="flex items-center gap-1"><Dumbbell size={12} />{program.sessionsPerWeek}/sem</span>
              <span className="flex items-center gap-1"><Users size={12} />{program.athleteCount} atletas</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
