'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, X, ChevronUp, ChevronDown, Sparkles,
  Save, FileText, Loader2, AlertTriangle, Dumbbell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useExerciseLibrary,
  useWorkoutPlans,
  MUSCLE_GROUP_LABELS,
  GOAL_LABELS,
  formatDuration,
  generateId,
} from '@/features/workout'
import type { WorkoutExercise, Exercise, WorkoutGoal, WorkoutPlan } from '@/features/workout'

const GOALS = Object.entries(GOAL_LABELS).map(([value, label]) => ({
  value: value as WorkoutGoal,
  label,
}))

function useCalc() {
  return useMemo(() => ({
    calcDuration(exercises: WorkoutExercise[]): number {
      if (exercises.length === 0) return 0
      const totalRest = exercises.reduce((sum, e) => sum + e.rest, 0)
      const totalSets = exercises.reduce((sum, e) => {
        if (typeof e.reps === 'number') return sum + e.sets * 2
        return sum + e.sets
      }, 0)
      return Math.round((totalRest + totalSets * 30) / 60)
    },
    calcVolume(exercises: WorkoutExercise[]): number {
      return exercises.reduce((sum, e) => {
        if (typeof e.reps === 'number' && e.weight) {
          return sum + e.sets * e.reps * e.weight
        }
        return sum
      }, 0)
    },
  }), [])
}

function AiModal({
  open,
  onClose,
  onApply,
}: {
  open: boolean
  onClose: () => void
  onApply: (exercises: WorkoutExercise[]) => void
}) {
  const [focus, setFocus] = useState<WorkoutGoal>('strength')
  const [intensity, setIntensity] = useState<'low' | 'medium' | 'high'>('medium')
  const [duration, setDuration] = useState(45)
  const [generating, setGenerating] = useState(false)
  const { allExercises } = useExerciseLibrary()

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 1500))

    const pool = allExercises.filter(ex => {
      if (intensity === 'low') return ex.difficulty === 'beginner'
      if (intensity === 'high') return ex.difficulty === 'advanced'
      return true
    })

    const count = Math.min(3 + Math.floor(Math.random() * 3), pool.length)
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count)

    const generated: WorkoutExercise[] = shuffled.map((ex, i) => ({
      id: generateId('we'),
      exerciseId: ex.id,
      exerciseName: ex.name,
      order: i + 1,
      sets: intensity === 'high' ? 4 : intensity === 'low' ? 3 : 3,
      reps: focus === 'endurance' ? 15 : focus === 'strength' ? 6 : 10,
      weight: intensity === 'high' ? 60 : 40,
      rest: focus === 'endurance' ? 45 : focus === 'strength' ? 120 : 75,
      muscleGroups: [...ex.muscleGroups],
    }))

    setGenerating(false)
    onApply(generated)
    onClose()
  }, [allExercises, focus, intensity, onApply, onClose])

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
            className="w-full max-w-md bg-surface-1 rounded-2xl border border-white/10"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <h3 className="text-base font-semibold text-white font-display">AI Generate Workout</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-2">Focus</label>
                <div className="flex flex-wrap gap-2">
                  {GOALS.map(g => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setFocus(g.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize',
                        focus === g.value
                          ? 'bg-orange-500 text-white'
                          : 'bg-white/5 text-white/50 hover:bg-white/10',
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-2">Intensity</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map(i => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIntensity(i)}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors',
                        intensity === i
                          ? 'bg-orange-500 text-white'
                          : 'bg-white/5 text-white/50 hover:bg-white/10',
                      )}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={e => setDuration(Math.max(15, Math.min(180, Number(e.target.value))))}
                  min={15}
                  max={180}
                  step={5}
                  className="w-24 bg-surface-3 border border-white/10 rounded-lg p-2.5 text-sm text-white outline-none focus:border-orange-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-white/5">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white/60 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className={cn(
                  'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors',
                  generating
                    ? 'bg-white/5 text-white/30 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white',
                )}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function FrequencyModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (frequency: 'once' | 'daily' | 'weekly' | 'custom') => void
}) {
  const [freq, setFreq] = useState<'once' | 'daily' | 'weekly' | 'custom'>('weekly')

  const FREQ_OPTIONS = [
    { value: 'once' as const, label: 'Once' },
    { value: 'daily' as const, label: 'Daily' },
    { value: 'weekly' as const, label: 'Weekly' },
    { value: 'custom' as const, label: 'Custom' },
  ]

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
            className="w-full max-w-sm bg-surface-1 rounded-2xl border border-white/10"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="text-base font-semibold text-white font-display">Save as Template</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-sm text-white/50">Select how often this template repeats:</p>
              {FREQ_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFreq(opt.value)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    freq === opt.value
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-white/5">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white/60 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(freq)}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors"
              >
                Save Template
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SkeletonPanel() {
  return (
    <div className="p-6 max-w-6xl mx-auto animate-pulse space-y-5">
      <div className="h-7 w-48 bg-white/5 rounded" />
      <div className="flex gap-6">
        <div className="w-[40%] space-y-3">
          <div className="h-10 w-full bg-white/5 rounded-lg" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="flex-1 space-y-3">
          <div className="h-10 w-full bg-white/5 rounded-lg" />
          <div className="h-10 w-40 bg-white/5 rounded-lg" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function WorkoutBuilder() {
  const {
    exercises, loading: libLoading, error: libError,
    search, setSearch,
  } = useExerciseLibrary()
  const { plans: _, loading: plansLoading, error: plansError, createPlan, saveAsTemplate } = useWorkoutPlans()
  const calc = useCalc()

  const [workoutName, setWorkoutName] = useState('')
  const [goal, setGoal] = useState<WorkoutGoal>('strength')
  const [workingExercises, setWorkingExercises] = useState<WorkoutExercise[]>([])
  const [showAiModal, setShowAiModal] = useState(false)
  const [showFreqModal, setShowFreqModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [editingExercise, setEditingExercise] = useState<string | null>(null)

  const duration = useMemo(() => calc.calcDuration(workingExercises), [workingExercises, calc])
  const volume = useMemo(() => calc.calcVolume(workingExercises), [workingExercises, calc])

  const addExercise = useCallback((ex: Exercise) => {
    setWorkingExercises(prev => [...prev, {
      id: generateId('we'),
      exerciseId: ex.id,
      exerciseName: ex.name,
      order: prev.length + 1,
      sets: 3,
      reps: 10,
      rest: 60,
      muscleGroups: [...ex.muscleGroups],
    }])
  }, [])

  const removeExercise = useCallback((id: string) => {
    setWorkingExercises(prev => prev.filter(e => e.id !== id).map((e, i) => ({ ...e, order: i + 1 })))
  }, [])

  const moveExercise = useCallback((id: string, direction: 'up' | 'down') => {
    setWorkingExercises(prev => {
      const idx = prev.findIndex(e => e.id === id)
      if (idx === -1) return prev
      if (direction === 'up' && idx === 0) return prev
      if (direction === 'down' && idx === prev.length - 1) return prev
      const next = [...prev]
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next.map((e, i) => ({ ...e, order: i + 1 }))
    })
  }, [])

  const updateExerciseField = useCallback((id: string, field: string, value: string | number) => {
    setWorkingExercises(prev => prev.map(e => {
      if (e.id !== id) return e
      if ((field === 'weight' || field === 'rpeTarget') && value === '') {
        const { [field]: _, ...rest } = e as any
        return rest as WorkoutExercise
      }
      return { ...e, [field]: value }
    }))
  }, [])

  const handleAiApply = useCallback((generated: WorkoutExercise[]) => {
    setWorkingExercises(generated)
  }, [])

  const resetBuilder = useCallback(() => {
    setWorkoutName('')
    setGoal('strength')
    setWorkingExercises([])
  }, [])

  const handleSave = useCallback(async () => {
    if (!workoutName.trim() || workingExercises.length === 0) return
    setSaving(true)
    await createPlan({
      name: workoutName.trim(),
      description: '',
      goal,
      exercises: workingExercises,
      estimatedDuration: duration,
      tags: [],
    })
    setSaving(false)
    setSavedMessage('Workout saved!')
    setTimeout(() => setSavedMessage(''), 3000)
    resetBuilder()
  }, [workoutName, goal, workingExercises, duration, createPlan, resetBuilder])

  const handleSaveTemplate = useCallback(async (frequency: 'once' | 'daily' | 'weekly' | 'custom') => {
    if (!workoutName.trim() || workingExercises.length === 0) return
    setSaving(true)
    const plan: WorkoutPlan = {
      id: '',
      name: workoutName.trim(),
      description: '',
      goal,
      exercises: workingExercises,
      estimatedDuration: duration,
      tags: [],
      createdAt: '',
    }
    await saveAsTemplate(plan, frequency)
    setSaving(false)
    setShowFreqModal(false)
    setSavedMessage('Template saved!')
    setTimeout(() => setSavedMessage(''), 3000)
    resetBuilder()
  }, [workoutName, goal, workingExercises, duration, saveAsTemplate, resetBuilder])

  const loading = libLoading || plansLoading
  const error = libError || plansError

  if (loading) return <SkeletonPanel />

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {savedMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 px-4 py-2.5 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400 font-medium"
        >
          {savedMessage}
        </motion.div>
      )}

      <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 12rem)' }}>
        {/* LEFT PANEL - Exercise Library */}
        <div className="w-[40%] shrink-0 sticky top-24 self-start space-y-3 max-h-[calc(100vh-10rem)] overflow-y-auto">
          <h2 className="text-sm font-semibold text-white/70 font-display uppercase tracking-wider">
            Exercise Library
          </h2>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search exercises..."
              className="w-full bg-surface-2 border border-white/5 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-orange-500/30 transition-colors"
            />
          </div>

          {libError && (
            <div className="flex items-center gap-3 py-8 text-center flex-col">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-red-400">{libError}</p>
            </div>
          )}

          {!libError && exercises.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <Dumbbell className="w-5 h-5 text-white/30" />
              </div>
              <p className="text-sm font-medium text-white/60">Create exercises first in the Exercise Library</p>
            </div>
          )}

          {!libError && exercises.length > 0 && (
            <div className="space-y-2">
              {exercises.map((ex, i) => (
                <motion.div
                  key={ex.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                >
                  <div className="group bg-surface-2 rounded-xl border border-white/5 p-3 hover:border-white/10 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{ex.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ex.muscleGroups.slice(0, 2).map(mg => (
                            <span
                              key={mg}
                              className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 text-[10px] font-medium"
                            >
                              {MUSCLE_GROUP_LABELS[mg] ?? mg}
                            </span>
                          ))}
                          {ex.muscleGroups.length > 2 && (
                            <span className="text-[10px] text-white/30">+{ex.muscleGroups.length - 2}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => addExercise(ex)}
                        className="shrink-0 p-1.5 rounded-md bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors"
                        title="Add to workout"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Workout Composition */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/70 font-display uppercase tracking-wider">
              Workout Builder
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAiModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Generate
              </button>
              <button
                onClick={() => setShowFreqModal(true)}
                disabled={!workoutName.trim() || workingExercises.length === 0}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  workoutName.trim() && workingExercises.length > 0
                    ? 'bg-white/5 text-white/60 hover:bg-white/10'
                    : 'bg-white/5 text-white/30 cursor-not-allowed',
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                Save as Template
              </button>
              <button
                onClick={handleSave}
                disabled={!workoutName.trim() || workingExercises.length === 0 || saving}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  workoutName.trim() && workingExercises.length > 0 && !saving
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-white/5 text-white/30 cursor-not-allowed',
                )}
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Plan
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <input
              value={workoutName}
              onChange={e => setWorkoutName(e.target.value)}
              placeholder="Workout name"
              className="w-full bg-surface-2 border border-white/5 rounded-lg p-3 text-base text-white placeholder:text-white/30 outline-none focus:border-orange-500/30 transition-colors font-display font-semibold"
            />

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/40">Goal:</span>
                <select
                  value={goal}
                  onChange={e => setGoal(e.target.value as WorkoutGoal)}
                  className="bg-surface-2 border border-white/5 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-orange-500/30 transition-colors"
                >
                  {GOALS.map(g => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>

              {workingExercises.length > 0 && (
                <>
                  <span className="text-xs text-white/30">|</span>
                  <span className="text-xs text-white/50">
                    Duration: <span className="text-white font-medium">{formatDuration(duration)}</span>
                  </span>
                  {volume > 0 && (
                    <>
                      <span className="text-xs text-white/30">|</span>
                      <span className="text-xs text-white/50">
                        Volume: <span className="text-white font-medium">{volume.toLocaleString()} kg</span>
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {workingExercises.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Dumbbell className="w-7 h-7 text-white/30" />
              </div>
              <p className="text-sm font-medium text-white/60">Search and add exercises to build your workout</p>
              <p className="text-xs text-white/40 mt-1">
                Click the <Plus className="w-3 h-3 inline" /> button on any exercise to add it here
              </p>
            </div>
          )}

          {workingExercises.length > 0 && (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {workingExercises.map((we, idx) => (
                  <motion.div
                    key={we.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="bg-surface-2 rounded-xl border border-white/5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => moveExercise(we.id, 'up')}
                              disabled={idx === 0}
                              className={cn(
                                'p-0.5 rounded transition-colors',
                                idx === 0 ? 'text-white/20 cursor-not-allowed' : 'text-white/30 hover:text-white/60 hover:bg-white/5',
                              )}
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moveExercise(we.id, 'down')}
                              disabled={idx === workingExercises.length - 1}
                              className={cn(
                                'p-0.5 rounded transition-colors',
                                idx === workingExercises.length - 1 ? 'text-white/20 cursor-not-allowed' : 'text-white/30 hover:text-white/60 hover:bg-white/5',
                              )}
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/30 font-mono">{idx + 1}.</span>
                              <span className="text-sm font-semibold text-white truncate">{we.exerciseName}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {we.muscleGroups.map(mg => (
                                <span
                                  key={mg}
                                  className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 text-[10px] font-medium"
                                >
                                  {MUSCLE_GROUP_LABELS[mg] ?? mg}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeExercise(we.id)}
                          className="p-1 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {editingExercise === we.id ? (
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={we.sets}
                              onChange={e => updateExerciseField(we.id, 'sets', Math.max(1, Number(e.target.value)))}
                              className="w-12 bg-surface-3 border border-white/10 rounded-md px-2 py-1 text-xs text-white text-center outline-none focus:border-orange-500/50"
                              min={1}
                            />
                            <span className="text-xs text-white/40">×</span>
                            <input
                              type="text"
                              value={we.reps}
                              onChange={e => {
                                const val = e.target.value
                                if (val === 'AMRAP' || val === 'failure') {
                                  updateExerciseField(we.id, 'reps', val)
                                } else {
                                  const num = Number(val)
                                  if (!isNaN(num)) updateExerciseField(we.id, 'reps', num)
                                }
                              }}
                              className="w-14 bg-surface-3 border border-white/10 rounded-md px-2 py-1 text-xs text-white text-center outline-none focus:border-orange-500/50"
                            />
                            <span className="text-xs text-white/40">@</span>
                            <input
                              type="number"
                              value={we.weight ?? ''}
                              onChange={e => updateExerciseField(we.id, 'weight', e.target.value ? Number(e.target.value) : '')}
                              className="w-14 bg-surface-3 border border-white/10 rounded-md px-2 py-1 text-xs text-white text-center outline-none focus:border-orange-500/50"
                              min={0}
                              placeholder="kg"
                            />
                            <span className="text-xs text-white/40">|</span>
                            <input
                              type="number"
                              value={we.rest}
                              onChange={e => updateExerciseField(we.id, 'rest', Math.max(0, Number(e.target.value)))}
                              className="w-14 bg-surface-3 border border-white/10 rounded-md px-2 py-1 text-xs text-white text-center outline-none focus:border-orange-500/50"
                              min={0}
                            />
                            <span className="text-xs text-white/40">s</span>
                          </div>
                          <input
                            type="number"
                            value={we.rpeTarget ?? ''}
                            onChange={e => updateExerciseField(we.id, 'rpeTarget', e.target.value ? Number(e.target.value) : '')}
                            placeholder="RPE"
                            className="w-14 bg-surface-3 border border-white/10 rounded-md px-2 py-1 text-xs text-white text-center outline-none focus:border-orange-500/50"
                            min={1}
                            max={10}
                            step={0.5}
                          />
                          <button
                            onClick={() => setEditingExercise(null)}
                            className="text-xs text-orange-400 hover:text-orange-300 font-medium"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => setEditingExercise(we.id)}
                          className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 cursor-pointer hover:bg-white/[0.02] rounded -mx-1 px-1 transition-colors"
                        >
                          <span className="text-xs text-white/60">
                            {we.sets} × {we.reps}
                            {we.weight ? ` @ ${we.weight} kg` : ''}
                            {' | '}{we.rest}s rest
                          </span>
                          {we.rpeTarget && (
                            <span className="text-xs text-blue-400">RPE {we.rpeTarget}</span>
                          )}
                          <span className="text-[10px] text-white/30 ml-auto">Click to edit</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <AiModal
        open={showAiModal}
        onClose={() => setShowAiModal(false)}
        onApply={handleAiApply}
      />

      <FrequencyModal
        open={showFreqModal}
        onClose={() => setShowFreqModal(false)}
        onConfirm={handleSaveTemplate}
      />
    </div>
  )
}
