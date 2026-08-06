'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, Reorder, AnimatePresence } from 'framer-motion'
import {
  Workout, WorkoutExerciseDetail, WorkoutSet, ExerciseDetail,
  WorkoutGoal, WorkoutType, SetType, RestPeriod
} from '../types'
import { MOCK_EXERCISE_DETAILS, WORKOUT_GOAL_LABELS, WORKOUT_TYPE_LABELS, REST_PERIOD_OPTIONS } from '../data/_mocks'
import { generateId, formatDuration, MUSCLE_GROUP_LABELS } from '../hooks/helpers'
import { ExerciseLibrary } from './ExerciseLibrary'
import { cn } from '@/lib/utils'
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
  Copy, Clock, Target, Dumbbell, X, Save, Sparkles, Play,
  ChevronLeft, ChevronRight, Info
} from 'lucide-react'

interface WorkoutBuilderProps {
  initialWorkout?: Workout
  onSave?: (workout: Workout) => void
  onPublish?: (workout: Workout) => void
  onGenerateAI?: (prompt: string) => void
  className?: string
}

const GOAL_OPTIONS: WorkoutGoal[] = ['strength', 'hypertrophy', 'endurance', 'speed', 'power', 'mobility', 'conditioning', 'warm_up', 'cool_down']
const TYPE_OPTIONS: WorkoutType[] = ['strength', 'cardio', 'hiit', 'mobility', 'sport_specific', 'competition', 'rest']
const SECTION_ORDER = ['warm_up', 'main', 'accessory', 'cool_down'] as const
const SET_TYPE_OPTIONS: { value: SetType; label: string }[] = [
  { value: 'working', label: 'Working' },
  { value: 'warmup', label: 'Warm-up' },
  { value: 'dropset', label: 'Drop Set' },
  { value: 'supersets', label: 'Superset' },
  { value: 'failure', label: 'To Failure' },
]

function createEmptySet(setNumber: number): WorkoutSet {
  return {
    id: generateId('set'),
    setNumber,
    setType: 'working',
    targetReps: 10,
    isCompleted: false,
    isSkipped: false,
  }
}

function createEmptyExercise(order: number): WorkoutExerciseDetail {
  return {
    id: generateId('we'),
    exerciseId: '',
    exerciseName: '',
    section: order <= 2 ? 'warm_up' : order <= 8 ? 'main' : 'accessory',
    order,
    sets: [createEmptySet(1)],
    rest: 90,
    tempo: '2-0-1-0',
  }
}

export function WorkoutBuilder({
  initialWorkout,
  onSave,
  onPublish,
  onGenerateAI,
  className,
}: WorkoutBuilderProps) {
  const [workout, setWorkout] = useState<Workout>(() => initialWorkout || {
    id: generateId('wkt'),
    name: 'New Workout',
    description: '',
    workoutType: 'strength',
    goal: 'strength',
    exercises: [],
    estimatedDuration: 45,
    status: 'scheduled',
    tags: [],
    createdAt: new Date().toISOString(),
  })

  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false)
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [showAIPanel, setShowAIPanel] = useState(false)

  // Calculate duration
  const calculatedDuration = useMemo(() => {
    let total = 0
    workout.exercises.forEach(ex => {
      const setTime = 30 // seconds per set average
      const restTime = ex.rest
      total += (ex.sets.length * setTime) + ((ex.sets.length - 1) * restTime)
    })
    return Math.ceil(total / 60) + 10 // Add 10 min for transitions
  }, [workout.exercises])

  const updateWorkout = useCallback((updates: Partial<Workout>) => {
    setWorkout(prev => ({ ...prev, ...updates }))
  }, [])

  const addExercise = useCallback((exercise: ExerciseDetail) => {
    const newExercise: WorkoutExerciseDetail = {
      id: generateId('we'),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      exercise,
      section: 'main',
      order: workout.exercises.length + 1,
      sets: [createEmptySet(1), createEmptySet(2), createEmptySet(3)],
      rest: 90,
      tempo: '2-0-1-0',
    }
    setWorkout(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise],
    }))
    setShowExerciseLibrary(false)
  }, [workout.exercises.length])

  const removeExercise = useCallback((exerciseId: string) => {
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.filter(e => e.id !== exerciseId).map((e, i) => ({ ...e, order: i + 1 })),
    }))
  }, [])

  const updateExercise = useCallback((exerciseId: string, updates: Partial<WorkoutExerciseDetail>) => {
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map(e =>
        e.id === exerciseId ? { ...e, ...updates } : e
      ),
    }))
  }, [])

  const reorderExercises = useCallback((newOrder: WorkoutExerciseDetail[]) => {
    setWorkout(prev => ({
      ...prev,
      exercises: newOrder.map((e, i) => ({ ...e, order: i + 1 })),
    }))
  }, [])

  const handleSave = useCallback(() => {
    onSave?.(workout)
  }, [workout, onSave])

  const handlePublish = useCallback(() => {
    onPublish?.(workout)
  }, [workout, onPublish])

  const exercisesBySection = useMemo(() => {
    const grouped: Record<string, WorkoutExerciseDetail[]> = {
      warm_up: [],
      main: [],
      accessory: [],
      cool_down: [],
    }
    workout.exercises.forEach(ex => {
      grouped[ex.section]?.push(ex)
    })
    return grouped
  }, [workout.exercises])

  return (
    <div className={cn('flex flex-col h-full bg-[#0F0F0F]', className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-[#2A2A2C]">
        <div className="flex items-center justify-between mb-4">
          <input
            type="text"
            value={workout.name}
            onChange={(e) => updateWorkout({ name: e.target.value })}
            className="text-xl font-bold bg-transparent text-[#FFFFFF] placeholder-[rgba(255,255,255,0.4)] focus:outline-none"
            placeholder="Workout name"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#0066FF] hover:bg-[#1A1A1C] rounded-lg transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              AI Assist
            </button>
          </div>
        </div>

        {/* Meta Fields */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-medium text-[rgba(255,255,255,0.4)] mb-1">Type</label>
            <select
              value={workout.workoutType}
              onChange={(e) => updateWorkout({ workoutType: e.target.value as WorkoutType })}
              className="w-full h-10 px-3 rounded-lg bg-[#141416] border border-[#2A2A2C] text-sm text-[#FFFFFF] focus:outline-none focus:border-[#0066FF]"
            >
              {TYPE_OPTIONS.map(type => (
                <option key={type} value={type}>{WORKOUT_TYPE_LABELS[type]}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-medium text-[rgba(255,255,255,0.4)] mb-1">Goal</label>
            <select
              value={workout.goal}
              onChange={(e) => updateWorkout({ goal: e.target.value as WorkoutGoal })}
              className="w-full h-10 px-3 rounded-lg bg-[#141416] border border-[#2A2A2C] text-sm text-[#FFFFFF] focus:outline-none focus:border-[#0066FF]"
            >
              {GOAL_OPTIONS.map(goal => (
                <option key={goal} value={goal}>{WORKOUT_GOAL_LABELS[goal]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end pb-0.5">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#141416] text-sm text-[rgba(255,255,255,0.7)]">
              <Clock className="w-4 h-4" />
              {formatDuration(calculatedDuration)}
            </div>
          </div>
        </div>
      </div>

      {/* AI Panel */}
      <AnimatePresence>
        {showAIPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 border-b border-[#2A2A2C] overflow-hidden"
          >
            <div className="p-4 bg-gradient-to-r from-[#0066FF]/10 to-transparent">
              <p className="text-sm text-[rgba(255,255,255,0.7)] mb-2">
                Describe the workout you want to create. For example:
              </p>
              <p className="text-xs text-[rgba(255,255,255,0.4)] italic mb-3">
                &quot;4-day upper/lower split for an intermediate lifter focusing on hypertrophy. Include progressive overload scheme.&quot;
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe your workout..."
                  className="flex-1 h-10 px-3 rounded-lg bg-[#141416] border border-[#2A2A2C] text-sm text-[#FFFFFF] placeholder-[rgba(255,255,255,0.4)] focus:outline-none focus:border-[#0066FF]"
                />
                <button
                  onClick={() => {
                    onGenerateAI?.(aiPrompt)
                    setShowAIPanel(false)
                    setAiPrompt('')
                  }}
                  disabled={!aiPrompt.trim()}
                  className="px-4 h-10 rounded-lg bg-[#0066FF] text-white text-sm font-medium hover:bg-[#0066FF]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Generate
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto">
          {workout.exercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Dumbbell className="w-16 h-16 text-[rgba(255,255,255,0.4)] mb-4" />
              <p className="text-lg font-medium text-[#FFFFFF] mb-2">
                No exercises yet
              </p>
              <p className="text-sm text-[rgba(255,255,255,0.7)] mb-4">
                Add exercises from the library to build your workout
              </p>
              <button
                onClick={() => setShowExerciseLibrary(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white rounded-lg font-medium hover:bg-[#FF6B00]/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Exercise
              </button>
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={workout.exercises}
              onReorder={reorderExercises}
              className="p-4 space-y-6"
            >
              {SECTION_ORDER.map(section => {
                const exercises = exercisesBySection[section]
                if (exercises.length === 0) return null

                return (
                  <div key={section}>
                    <h3 className="text-sm font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-3 flex items-center gap-2">
                      {section === 'warm_up' && '🔥 Warm Up'}
                      {section === 'main' && '💪 Main Work'}
                      {section === 'accessory' && '🎯 Accessory'}
                      {section === 'cool_down' && '❄️ Cool Down'}
                      <span className="text-xs text-[rgba(255,255,255,0.4)] font-normal">
                        {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
                      </span>
                    </h3>
                    <div className="space-y-3">
                      {exercises.map((exercise) => (
                        <Reorder.Item
                          key={exercise.id}
                          value={exercise}
                          className="bg-[#1A1A1C] rounded-lg border border-[#2A2A2C] overflow-hidden"
                        >
                          <ExerciseBlock
                            exercise={exercise}
                            isExpanded={expandedExercise === exercise.id}
                            onToggleExpand={() => setExpandedExercise(
                              expandedExercise === exercise.id ? null : exercise.id
                            )}
                            onUpdate={(updates) => updateExercise(exercise.id, updates)}
                            onRemove={() => removeExercise(exercise.id)}
                          />
                        </Reorder.Item>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Add Exercise Button */}
              <button
                onClick={() => setShowExerciseLibrary(true)}
                className="w-full py-4 border-2 border-dashed border-[#2A2A2C] rounded-lg text-[rgba(255,255,255,0.4)] hover:border-[#FF6B00] hover:text-[#FF6B00] transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Exercise
              </button>
            </Reorder.Group>
          )}
        </div>

        {/* Exercise Library Sidebar */}
        <AnimatePresence>
          {showExerciseLibrary && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex-shrink-0 border-l border-[#2A2A2C] overflow-hidden bg-[#141416]"
            >
              <div className="flex items-center justify-between p-3 border-b border-[#2A2A2C]">
                <h3 className="font-semibold text-[#FFFFFF]">Exercise Library</h3>
                <button
                  onClick={() => setShowExerciseLibrary(false)}
                  className="p-1 text-[rgba(255,255,255,0.4)] hover:text-[#FFFFFF]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ExerciseLibrary
                onAddExercise={addExercise}
                selectedExercises={workout.exercises.map(e => e.exerciseId)}
                className="h-[calc(100%-52px)]"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 p-4 border-t border-[#2A2A2C] bg-[#141416]">
        <div className="flex items-center justify-between">
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-[rgba(255,255,255,0.7)] hover:text-[#FFFFFF] transition-colors"
          >
            Save Draft
          </button>
          <button
            onClick={handlePublish}
            className="flex items-center gap-2 px-6 py-2 bg-[#FF6B00] text-white rounded-lg font-medium hover:bg-[#FF6B00]/90 transition-colors"
          >
            <Play className="w-4 h-4" />
            Publish
          </button>
        </div>
      </div>
    </div>
  )
}

// Exercise Block Component
function ExerciseBlock({
  exercise,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRemove,
}: {
  exercise: WorkoutExerciseDetail
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdate: (updates: Partial<WorkoutExerciseDetail>) => void
  onRemove: () => void
}) {
  const addSet = () => {
    const newSet = createEmptySet(exercise.sets.length + 1)
    onUpdate({ sets: [...exercise.sets, newSet] })
  }

  const removeSet = (setId: string) => {
    if (exercise.sets.length > 1) {
      onUpdate({
        sets: exercise.sets
          .filter(s => s.id !== setId)
          .map((s, i) => ({ ...s, setNumber: i + 1 }))
      })
    }
  }

  const updateSet = (setId: string, updates: Partial<WorkoutSet>) => {
    onUpdate({
      sets: exercise.sets.map(s => s.id === setId ? { ...s, ...updates } : s)
    })
  }

  return (
    <div>
      {/* Header */}
      <div
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-[#1C1C1C] transition-colors"
        onClick={onToggleExpand}
      >
        <div className="cursor-grab text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)]">
          <GripVertical className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#FFFFFF] truncate">
            {exercise.exerciseName || 'Select exercise'}
          </p>
          <p className="text-sm text-[rgba(255,255,255,0.7)]">
            {exercise.sets.length} sets × {exercise.sets[0]?.targetReps} reps • Rest {exercise.rest}s
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="p-1.5 text-[rgba(255,255,255,0.4)] hover:text-[#FF3D00] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[rgba(255,255,255,0.4)]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[rgba(255,255,255,0.4)]" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[#2A2A2C] overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Sets Configuration */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[rgba(255,255,255,0.7)]">Sets</p>
                  <button
                    onClick={addSet}
                    className="text-sm text-[#0066FF] hover:underline"
                  >
                    + Add Set
                  </button>
                </div>
                <div className="space-y-2">
                  {exercise.sets.map((set, idx) => (
                    <div key={set.id} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-[rgba(255,255,255,0.4)]">#{set.setNumber}</span>
                      <select
                        value={set.setType}
                        onChange={(e) => updateSet(set.id, { setType: e.target.value as SetType })}
                        className="w-24 h-8 px-2 rounded bg-[#141416] border border-[#2A2A2C] text-sm text-[#FFFFFF]"
                      >
                        {SET_TYPE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={set.targetReps === 'AMRAP' ? '' : set.targetReps}
                        onChange={(e) => updateSet(set.id, {
                          targetReps: e.target.value === '' ? 'AMRAP' : parseInt(e.target.value) || 10
                        })}
                        className="w-16 h-8 px-2 rounded bg-[#141416] border border-[#2A2A2C] text-sm text-[#FFFFFF] text-center"
                        placeholder="Reps"
                      />
                      <span className="text-sm text-[rgba(255,255,255,0.4)]">×</span>
                      <input
                        type="number"
                        value={set.targetWeight || ''}
                        onChange={(e) => updateSet(set.id, { targetWeight: parseFloat(e.target.value) || undefined })}
                        className="w-20 h-8 px-2 rounded bg-[#141416] border border-[#2A2A2C] text-sm text-[#FFFFFF] text-center"
                        placeholder="kg"
                      />
                      {exercise.sets.length > 1 && (
                        <button
                          onClick={() => removeSet(set.id)}
                          className="p-1 text-[rgba(255,255,255,0.4)] hover:text-[#FF3D00]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rest Period */}
              <div>
                <p className="text-sm font-medium text-[rgba(255,255,255,0.7)] mb-2">Rest</p>
                <select
                  value={exercise.rest}
                  onChange={(e) => onUpdate({ rest: parseInt(e.target.value) as RestPeriod })}
                  className="w-full h-10 px-3 rounded-lg bg-[#141416] border border-[#2A2A2C] text-sm text-[#FFFFFF]"
                >
                  {REST_PERIOD_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <p className="text-sm font-medium text-[rgba(255,255,255,0.7)] mb-2">Notes</p>
                <textarea
                  value={exercise.notes || ''}
                  onChange={(e) => onUpdate({ notes: e.target.value })}
                  placeholder="Add notes for this exercise..."
                  className="w-full h-20 px-3 py-2 rounded-lg bg-[#141416] border border-[#2A2A2C] text-sm text-[#FFFFFF] placeholder-[rgba(255,255,255,0.4)] resize-none focus:outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}