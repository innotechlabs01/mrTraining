'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Trash2, X, AlertTriangle, FileText, Plus, Clock,
  Dumbbell, ExternalLink, Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useWorkoutPlans,
  MUSCLE_GROUP_LABELS,
  GOAL_LABELS,
  formatDuration,
} from '@/features/workout'
import type { WorkoutTemplate } from '@/features/workout'

function SkeletonCard() {
  return (
    <div className="bg-surface-2 rounded-xl border border-white/5 p-5 animate-pulse space-y-3">
      <div className="h-5 w-2/3 bg-white/5 rounded" />
      <div className="h-4 w-20 bg-white/5 rounded-full" />
      <div className="h-3 w-1/2 bg-white/5 rounded" />
      <div className="h-3 w-1/3 bg-white/5 rounded" />
      <div className="h-3 w-full bg-white/5 rounded" />
      <div className="flex justify-between pt-3 border-t border-white/5">
        <div className="h-8 w-24 bg-white/5 rounded-lg" />
        <div className="h-8 w-8 bg-white/5 rounded-lg" />
      </div>
    </div>
  )
}

function TemplatePreviewModal({
  template,
  open,
  onClose,
}: {
  template: WorkoutTemplate | null
  open: boolean
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {open && template && (
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
            className="w-full max-w-lg bg-surface-1 rounded-2xl border border-white/10 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-white font-display">{template.name}</h3>
                <p className="text-xs text-white/40 mt-0.5">{template.description}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="flex items-center gap-3">
                <span className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium capitalize bg-orange-500/10 text-orange-400',
                )}>
                  {GOAL_LABELS[template.goal] ?? template.goal}
                </span>
                <span className="flex items-center gap-1 text-xs text-white/50">
                  <Clock className="w-3 h-3" />
                  {formatDuration(template.estimatedDuration)}
                </span>
                <span className="flex items-center gap-1 text-xs text-white/50">
                  <Dumbbell className="w-3 h-3" />
                  {template.exercises.length} exercises
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-white/50 capitalize">
                  {template.frequency}
                </span>
              </div>

              <div className="space-y-2">
                {template.exercises.map((ex, i) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between bg-surface-2 rounded-lg px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-white/30 font-mono shrink-0">{i + 1}.</span>
                      <span className="text-sm font-medium text-white truncate">{ex.exerciseName}</span>
                    </div>
                    <span className="text-xs text-white/50 shrink-0 ml-3">
                      {ex.sets}×{ex.reps}
                      {ex.weight ? ` @ ${ex.weight}kg` : ''} | {ex.rest}s
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-white/5 shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white/60 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Close
              </button>
              <Link
                href="/coach/workouts/builder"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Use in Builder
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function DeleteConfirmDialog({
  open,
  templateName,
  onConfirm,
  onCancel,
}: {
  open: boolean
  templateName: string
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
                <h3 className="text-base font-semibold text-white">Delete Template</h3>
                <p className="text-sm text-white/50">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-white/60">
              Are you sure you want to delete <span className="text-white font-medium">&ldquo;{templateName}&rdquo;</span>?
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

export default function TemplateGallery() {
  const { templates, loading, error, deleteTemplate } = useWorkoutPlans()
  const [previewTemplate, setPreviewTemplate] = useState<WorkoutTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorkoutTemplate | null>(null)

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    await deleteTemplate(deleteTarget.id)
    setDeleteTarget(null)
  }, [deleteTarget, deleteTemplate])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white font-display">Templates</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {templates.length} template{templates.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/coach/workouts/builder"
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors active:scale-[0.97]"
        >
          <Plus className="w-4 h-4" />
          New Template
        </Link>
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

      {!loading && !error && templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-white/30" />
          </div>
          <p className="text-sm font-medium text-white/60">No templates yet</p>
          <p className="text-xs text-white/40 mt-1 mb-4">Create your first template from the builder</p>
          <Link
            href="/coach/workouts/builder"
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" />
            Create your first template
          </Link>
        </div>
      )}

      {!loading && !error && templates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
              layout
            >
              <div
                onClick={() => setPreviewTemplate(template)}
                className="group relative bg-surface-2 rounded-xl border border-white/5 p-5 cursor-pointer hover:border-white/10 hover:bg-surface-3 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-white truncate font-display">{template.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] font-medium capitalize bg-orange-500/10 text-orange-400',
                      )}>
                        {GOAL_LABELS[template.goal] ?? template.goal}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/50 capitalize">
                        {template.frequency}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <span className="flex items-center gap-1 text-xs text-white/50">
                    <Dumbbell className="w-3 h-3" />
                    {template.exercises.length} exercises
                  </span>
                  <span className="flex items-center gap-1 text-xs text-white/50">
                    <Clock className="w-3 h-3" />
                    {formatDuration(template.estimatedDuration)}
                  </span>
                </div>

                {template.description && (
                  <p className="text-xs text-white/40 mt-2 line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-3 h-3" />
                    <span>Use in Builder</span>
                  </div>
                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setDeleteTarget(template)}
                      className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <TemplatePreviewModal
        template={previewTemplate}
        open={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        templateName={deleteTarget?.name ?? ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
