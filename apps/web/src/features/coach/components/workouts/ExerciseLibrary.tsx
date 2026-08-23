'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, MoreVertical, Edit, Trash2, X, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useExerciseLibrary, MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS } from '@/features/workout'
import type { Exercise, MuscleGroup, Equipment, Difficulty } from '@/features/workout'

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  beginner: 'text-green-400 bg-green-400/10 border-green-400/20',
  intermediate: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  advanced: 'text-red-400 bg-red-400/10 border-red-400/20',
}

const EQUIPMENT_OPTIONS: { value: Equipment | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  ...Object.entries(EQUIPMENT_LABELS).map(([value, label]) => ({
    value: value as Equipment,
    label,
  })),
]

const MUSCLE_OPTIONS: { value: MuscleGroup | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  ...Object.entries(MUSCLE_GROUP_LABELS).map(([value, label]) => ({
    value: value as MuscleGroup,
    label,
  })),
]

interface ExerciseFormData {
  name: string
  description: string
  muscleGroups: MuscleGroup[]
  equipment: Equipment
  difficulty: Difficulty
  instructions: string
  videoUrl: string
}

const EMPTY_FORM: ExerciseFormData = {
  name: '',
  description: '',
  muscleGroups: [],
  equipment: 'bodyweight',
  difficulty: 'beginner',
  instructions: '',
  videoUrl: '',
}

function DeleteConfirmDialog({
  open,
  exerciseName,
  onConfirm,
  onCancel,
}: {
  open: boolean
  exerciseName: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-sm bg-surface-1 rounded-2xl border border-white/10 p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Delete Exercise</h3>
                <p className="text-sm text-white/50">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-white/60">
              Are you sure you want to delete <span className="text-white font-medium">&ldquo;{exerciseName}&rdquo;</span>?
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white/60 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CreateExerciseModal({
  open,
  exercise,
  onClose,
  onSave,
}: {
  open: boolean
  exercise: Exercise | null
  onClose: () => void
  onSave: (data: ExerciseFormData) => Promise<void>
}) {
  const [form, setForm] = useState<ExerciseFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (exercise) {
        setForm({
          name: exercise.name,
          description: exercise.description,
          muscleGroups: [...exercise.muscleGroups],
          equipment: exercise.equipment,
          difficulty: exercise.difficulty,
          instructions: exercise.instructions.join(', '),
          videoUrl: exercise.videoUrl ?? '',
        })
      } else {
        setForm(EMPTY_FORM)
      }
    }
  }, [open, exercise])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const toggleMuscle = (mg: MuscleGroup) => {
    setForm(prev => ({
      ...prev,
      muscleGroups: prev.muscleGroups.includes(mg)
        ? prev.muscleGroups.filter(m => m !== mg)
        : [...prev.muscleGroups, mg],
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  const isEdit = !!exercise

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
              <h3 className="text-lg font-semibold text-white font-display">
                {isEdit ? 'Edit Exercise' : 'Create Exercise'}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Exercise name"
                  className="w-full bg-surface-3 border border-white/10 rounded-lg p-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-orange-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description"
                  rows={2}
                  className="w-full bg-surface-3 border border-white/10 rounded-lg p-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-orange-500/50 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Muscle Groups</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(MUSCLE_GROUP_LABELS).map(([value, label]) => {
                    const selected = form.muscleGroups.includes(value as MuscleGroup)
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleMuscle(value as MuscleGroup)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                          selected
                            ? 'bg-orange-500 text-white'
                            : 'bg-white/5 text-white/50 hover:bg-white/10',
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Equipment</label>
                  <select
                    value={form.equipment}
                    onChange={e => setForm(p => ({ ...p, equipment: e.target.value as Equipment }))}
                    className="w-full bg-surface-3 border border-white/10 rounded-lg p-2.5 text-sm text-white outline-none focus:border-orange-500/50 transition-colors"
                  >
                    {EQUIPMENT_OPTIONS.filter(o => o.value !== 'all').map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Difficulty</label>
                  <div className="flex gap-2">
                    {(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, difficulty: d }))}
                        className={cn(
                          'flex-1 py-2 rounded-lg text-xs font-medium transition-colors capitalize',
                          form.difficulty === d
                            ? 'bg-orange-500 text-white'
                            : 'bg-white/5 text-white/50 hover:bg-white/10',
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Instructions <span className="text-white/30">(comma-separated steps)</span>
                </label>
                <textarea
                  value={form.instructions}
                  onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))}
                  placeholder="Set up bar, Lower to chest, Press up"
                  rows={2}
                  className="w-full bg-surface-3 border border-white/10 rounded-lg p-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-orange-500/50 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Video URL <span className="text-white/30">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    value={form.videoUrl}
                    onChange={e => setForm(p => ({ ...p, videoUrl: e.target.value }))}
                    placeholder="https://..."
                    className="flex-1 bg-surface-3 border border-white/10 rounded-lg p-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-orange-500/50 transition-colors"
                  />
                  {exercise && (
                    <label className="flex items-center px-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:bg-white/10 hover:text-white/80 cursor-pointer transition-colors shrink-0">
                      Subir archivo
                      <input
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file || !exercise?.id) return
                          try {
                            const { data } = await fetch(`/api/exercises/${exercise.id}/video`, {
                              method: 'POST',
                              body: file,
                              headers: { 'Content-Type': file.type },
                            }).then(r => r.json())
                            if (data?.videoUrl) setForm(p => ({ ...p, videoUrl: data.videoUrl }))
                          } catch (err) {
                            console.error('Video upload failed:', err)
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
                {exercise && (
                  <p className="text-[10px] text-white/30 mt-1">MP4, MOV o WebM · máx 50 MB</p>
                )}
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
                disabled={!form.name.trim() || saving}
                className={cn(
                  'px-5 py-2 rounded-lg text-sm font-semibold transition-colors',
                  form.name.trim() && !saving
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-white/5 text-white/30 cursor-not-allowed',
                )}
              >
                {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Exercise'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ExerciseCard({
  exercise,
  index,
  onEdit,
  onDelete,
}: {
  exercise: Exercise
  index: number
  onEdit: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      layout
    >
      <div
        onClick={() => onEdit()}
        className="group relative bg-surface-2 rounded-xl border border-white/5 p-4 cursor-pointer hover:border-white/10 hover:bg-surface-3 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-white truncate">{exercise.name}</h4>
            <p className="text-xs text-white/50 mt-1 line-clamp-2 leading-relaxed">
              {exercise.description}
            </p>
          </div>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o) }}
              className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/5 text-white/40 hover:text-white/70 transition-all"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-8 w-36 bg-surface-2 rounded-lg border border-white/10 shadow-lg py-1 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => { onEdit(); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/5 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => { onDelete(); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {exercise.muscleGroups.slice(0, 3).map(mg => (
            <span
              key={mg}
              className="px-2 py-0.5 rounded-md bg-white/5 text-white/50 text-[10px] font-medium"
            >
              {MUSCLE_GROUP_LABELS[mg] ?? mg}
            </span>
          ))}
          {exercise.muscleGroups.length > 3 && (
            <span className="text-[10px] text-white/30">+{exercise.muscleGroups.length - 3}</span>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <span className="text-[11px] text-white/40">
            {EQUIPMENT_LABELS[exercise.equipment] ?? exercise.equipment}
          </span>
          <span
            className={cn(
              'px-2 py-0.5 rounded-md text-[10px] font-medium border capitalize',
              DIFFICULTY_STYLES[exercise.difficulty],
            )}
          >
            {exercise.difficulty}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-surface-2 rounded-xl border border-white/5 p-4 animate-pulse space-y-3">
      <div className="h-4 w-2/3 bg-white/5 rounded" />
      <div className="h-3 w-full bg-white/5 rounded" />
      <div className="h-3 w-4/5 bg-white/5 rounded" />
      <div className="flex gap-1.5 pt-1">
        <div className="h-4 w-14 bg-white/5 rounded-md" />
        <div className="h-4 w-14 bg-white/5 rounded-md" />
      </div>
      <div className="flex justify-between pt-3 border-t border-white/5">
        <div className="h-3 w-16 bg-white/5 rounded" />
        <div className="h-3 w-14 bg-white/5 rounded" />
      </div>
    </div>
  )
}

export default function ExerciseLibrary() {
  const {
    exercises, loading, error, search, setSearch,
    filterMuscle, setFilterMuscle, filterEquipment, setFilterEquipment,
    createExercise, updateExercise, deleteExercise,
  } = useExerciseLibrary()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null)

  const openCreate = useCallback(() => {
    setEditingExercise(null)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((ex: Exercise) => {
    setEditingExercise(ex)
    setModalOpen(true)
  }, [])

  const handleSave = useCallback(async (form: ExerciseFormData) => {
    const data = {
      name: form.name.trim(),
      description: form.description.trim(),
      muscleGroups: form.muscleGroups,
      equipment: form.equipment,
      difficulty: form.difficulty,
      instructions: form.instructions.split(',').map(s => s.trim()).filter(Boolean),
      videoUrl: form.videoUrl.trim() || undefined,
    }

    if (editingExercise) {
      await updateExercise(editingExercise.id, data)
    } else {
      await createExercise(data as Omit<Exercise, 'id' | 'createdAt'>)
    }
  }, [editingExercise, createExercise, updateExercise])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    await deleteExercise(deleteTarget.id)
    setDeleteTarget(null)
  }, [deleteTarget, deleteExercise])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white font-display">Exercise Library</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors active:scale-[0.97]"
        >
          <Plus className="w-4 h-4" />
          Create Exercise
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search exercises..."
          className="w-full bg-surface-2 border border-white/5 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-orange-500/30 transition-colors"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-white/40 mr-1">Muscle:</span>
        {MUSCLE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilterMuscle(opt.value)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
              filterMuscle === opt.value
                ? 'bg-orange-500 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-white/40 mr-1">Equipment:</span>
        {EQUIPMENT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilterEquipment(opt.value)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
              filterEquipment === opt.value
                ? 'bg-orange-500 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
          <p className="text-red-400 text-sm font-medium">{error}</p>
          <p className="text-xs text-white/40 mt-1">Try refreshing the page.</p>
        </div>
      )}

      {!loading && !error && exercises.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Search className="w-6 h-6 text-white/30" />
          </div>
          <p className="text-sm font-medium text-white/60">Build your first exercise</p>
          <p className="text-xs text-white/40 mt-1 mb-4">Create exercises to start building workouts.</p>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" />
            Create Exercise
          </button>
        </div>
      )}

      {!loading && !error && exercises.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exercises.map((ex, i) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              index={i}
              onEdit={() => openEdit(ex)}
              onDelete={() => setDeleteTarget(ex)}
            />
          ))}
        </div>
      )}

      <CreateExerciseModal
        open={modalOpen}
        exercise={editingExercise}
        onClose={() => { setModalOpen(false); setEditingExercise(null) }}
        onSave={handleSave}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        exerciseName={deleteTarget?.name ?? ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
