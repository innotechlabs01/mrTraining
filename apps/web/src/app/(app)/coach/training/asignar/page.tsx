'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Check, Dumbbell, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAthletes } from '@/features/coach/hooks/useAthletes'
import { useAuth } from '@/features/auth/contexts/MockAuthContext'
import { workoutApi, type Workout } from '@/features/shared/api/client'
import type { TrainingMode } from '@/features/coach/types'

type WorkoutPlan = {
  id: string
  name: string
  focus?: string
  estimatedDuration?: number
  coachNote?: string
  exercises: Array<{ id: string; name: string; sets: number; reps: number; rest: number; completedSets: number; weight?: number }>
}

type AssignType = 'workout' | 'program'

const MOCK_TODAY_WORKOUT: WorkoutPlan = {
  id: 'wo-1', name: 'Morning Strength + HIIT Finisher', focus: 'Full Body', estimatedDuration: 55,
  coachNote: 'Focus on controlled tempo. No rushing.',
  exercises: [
    { id: 'ex-bb-1', name: 'Barbell Back Squat', sets: 4, reps: 8, rest: 90, completedSets: 0, weight: 80 },
    { id: 'ex-bb-2', name: 'Bench Press', sets: 4, reps: 8, rest: 90, completedSets: 0, weight: 60 },
    { id: 'ex-bb-3', name: 'Pull-Ups', sets: 3, reps: 10, rest: 60, completedSets: 0 },
    { id: 'ex-bb-4', name: 'HIIT: Burpees', sets: 3, reps: 15, rest: 30, completedSets: 0 },
  ],
}

const MOCK_WORKOUT_MAP: Record<string, WorkoutPlan> = {
  'wk-1': MOCK_TODAY_WORKOUT,
  'wk-2': { id: 'wo-2', name: 'Flying 30m Sprints', focus: 'Top Speed', estimatedDuration: 45, coachNote: 'Explode out of blocks', exercises: [{ id: 'ex-fast-1', name: 'Dynamic Warmup', sets: 1, reps: 10, rest: 0, completedSets: 0 }, { id: 'ex-fast-2', name: 'A-Skips', sets: 3, reps: 20, rest: 60, completedSets: 0 }, { id: 'ex-fast-3', name: 'Flying 30m Sprints', sets: 5, reps: 1, rest: 120, completedSets: 0 }, { id: 'ex-fast-4', name: 'Block Starts', sets: 5, reps: 1, rest: 90, completedSets: 0 }] },
  'wk-3': { id: 'wo-3', name: 'Strength & Conditioning', focus: 'Max Strength', estimatedDuration: 75, exercises: [{ id: 'ex-strength-1', name: 'Back Squat', sets: 5, reps: 5, rest: 180, completedSets: 0, weight: 100 }, { id: 'ex-strength-2', name: 'Bench Press', sets: 4, reps: 8, rest: 120, completedSets: 0, weight: 60 }, { id: 'ex-strength-3', name: 'Deadlift', sets: 3, reps: 3, rest: 180, completedSets: 0, weight: 120 }] },
};

const MOCK_CONTENT = {
  workout: [
    { id: 'wk-1', name: 'Dynamic Warmup Circuit' },
    { id: 'wk-2', name: 'Flying 30m Sprints' },
    { id: 'wk-3', name: 'Strength & Conditioning' },
    { id: 'wk-4', name: 'Hill Repeats' },
    { id: 'wk-5', name: 'Crossfit WOD #47' },
  ],
  program: [
    { id: 'prog-1', name: 'Velocidad - Fase 2' },
    { id: 'prog-2', name: 'Base Running - Maratón' },
    { id: 'prog-3', name: 'Full Body HIIT' },
    { id: 'prog-4', name: 'Técnica de nado' },
  ],
}

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DAY_INDEX = [1, 2, 3, 4, 5, 6, 0]

const MODALITIES: { label: string; value: TrainingMode }[] = [
  { label: 'Virtual', value: 'virtual' },
  { label: 'Presencial', value: 'presencial' },
  { label: 'Híbrido', value: 'hibrido' },
  { label: 'Running', value: 'running' },
]

export default function CoachAsignarPage() {
  const { athletes } = useAthletes()
  const { user } = useAuth()
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([])
  const [assignType, setAssignType] = useState<AssignType>('workout')
  const [selectedContent, setSelectedContent] = useState('')
  const [modality, setModality] = useState<TrainingMode>('presencial')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [searchAthlete, setSearchAthlete] = useState('')
  const [assigning, setAssigning] = useState(false)

  const toggleAthlete = (id: string) => {
    setSelectedAthletes((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    )
  }

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  const filteredAthletes = athletes.filter((a) =>
    a.name.toLowerCase().includes(searchAthlete.toLowerCase()),
  )

  const contentOptions = assignType === 'workout' ? MOCK_CONTENT.workout : MOCK_CONTENT.program

  const handleAssign = async () => {
    if (!selectedContent || selectedAthletes.length === 0 || !user) return
    setAssigning(true)
    try {
      const contentOption = contentOptions.find(c => c.id === selectedContent)
      const workoutPlan = assignType === 'workout' ? MOCK_WORKOUT_MAP[selectedContent] : undefined
      
      // Use the start date from the form or today
      const startDate = new Date().toISOString().split('T')[0]
      
      for (const athId of selectedAthletes) {
        const athlete = athletes.find(a => a.id === athId)
        
        // Convert the workout plan to the API format. name is required by
        // workout_exercises; sets/reps stay flat numbers for the training schema.
        const exercises = workoutPlan?.exercises.map((ex, idx) => ({
          name: ex.name,
          sortOrder: idx,
          notes: '',
          restSeconds: ex.rest || 0,
          sets: ex.sets
            ? (Array.isArray(ex.sets) ? ex.sets.length : ex.sets)
            : 1,
          reps: ex.reps || (Array.isArray(ex.sets) ? ex.sets[0]?.prescribedReps ?? 0 : 0),
          weightKg: ex.weight ?? (Array.isArray(ex.sets) ? ex.sets[0]?.prescribedWeight ?? null : null),
        })) || []
        
        await workoutApi.create({
          name: contentOption?.name || 'Workout',
          description: workoutPlan?.focus || '',
          sportType: athlete?.sport || 'general',
          scheduledDate: startDate,
          athleteId: athId,
          exercises,
        })
      }
      alert(`Asignado a ${selectedAthletes.length} atleta${selectedAthletes.length > 1 ? 's' : ''}`)
    } catch (error) {
      console.error('Failed to assign workout:', error)
      alert('Error al asignar el workout')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-display font-bold text-white">Asignar</h1>
        <p className="text-sm text-white/40 mt-1">Asigna workouts o programas a atletas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-white/5 bg-surface-1 p-4">
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Atletas</h2>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchAthlete}
                onChange={(e) => setSearchAthlete(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-0 border border-white/5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-brand-primary/50"
              />
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-hide">
              {filteredAthletes.map((a) => {
                const selected = selectedAthletes.includes(a.id)
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleAthlete(a.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all text-left',
                      selected
                        ? 'bg-brand-primary/10 text-brand-primary'
                        : 'text-white/60 hover:bg-white/5',
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center transition-all',
                      selected ? 'bg-brand-primary border-brand-primary' : 'border-white/20',
                    )}>
                      {selected && <Check size={10} className="text-white" />}
                    </div>
                    <span className="font-medium">{a.name}</span>
                    <span className="text-white/30 ml-auto">{a.sport}</span>
                  </button>
                )
              })}
            </div>
            {selectedAthletes.length > 0 && (
              <p className="text-xs text-brand-primary mt-2 font-medium">
                {selectedAthletes.length} seleccionados
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl border border-white/5 bg-surface-1 p-4 space-y-4">
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Configuración</h2>

            <div>
              <p className="text-xs text-white/40 mb-2">Tipo de asignación</p>
              <div className="flex gap-2">
                {([
                  { label: 'Workout', value: 'workout' as const, icon: Dumbbell },
                  { label: 'Programa', value: 'program' as const, icon: FileText },
                ]).map((t) => (
                  <button
                    key={t.value}
                    onClick={() => { setAssignType(t.value); setSelectedContent('') }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition-all',
                      assignType === t.value
                        ? 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary'
                        : 'border-white/10 text-white/40 hover:border-white/20',
                    )}
                  >
                    <t.icon size={14} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-white/40 mb-2">Contenido</p>
              <select
                value={selectedContent}
                onChange={(e) => setSelectedContent(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-0 border border-white/5 text-xs text-white focus:outline-none focus:border-brand-primary/50"
              >
                <option value="">Seleccionar {assignType}...</option>
                {contentOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-xs text-white/40 mb-2">Modalidad</p>
              <div className="flex flex-wrap gap-2">
                {MODALITIES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setModality(m.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      modality === m.value
                        ? 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary'
                        : 'border-white/10 text-white/40 hover:border-white/20',
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-white/40 mb-2">Días de la semana</p>
              <div className="flex gap-1.5">
                {DAYS.map((day, i) => {
                  const idx = DAY_INDEX[i]
                  return (
                    <button
                      key={day}
                      onClick={() => toggleDay(idx)}
                      className={cn(
                        'w-9 h-9 rounded-lg text-xs font-medium border transition-all',
                        selectedDays.includes(idx)
                          ? 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary'
                          : 'border-white/10 text-white/40 hover:border-white/20',
                      )}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-xs text-white/40 mb-2">Desde</p>
                <input
                  type="date"
                  className="w-full px-3 py-2 rounded-lg bg-surface-0 border border-white/5 text-xs text-white focus:outline-none focus:border-brand-primary/50"
                />
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/40 mb-2">Hasta</p>
                <input
                  type="date"
                  className="w-full px-3 py-2 rounded-lg bg-surface-0 border border-white/5 text-xs text-white focus:outline-none focus:border-brand-primary/50"
                />
              </div>
            </div>

            <button
              disabled={!selectedContent || selectedAthletes.length === 0 || assigning}
              onClick={handleAssign}
              className={cn(
                'w-full py-2.5 rounded-lg text-sm font-semibold transition-all',
                selectedContent && selectedAthletes.length > 0
                  ? 'bg-brand-primary text-white hover:bg-brand-primary/90'
                  : 'bg-white/5 text-white/20 cursor-not-allowed',
              )}
            >
              {assigning ? 'Asignando...' : `Asignar a ${selectedAthletes.length > 0 ? `${selectedAthletes.length} atleta${selectedAthletes.length > 1 ? 's' : ''}` : 'seleccionar atletas'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
