'use client'

/**
 * Real workout templates, backed by /api/coach/workout-templates (migration 014).
 * The hook keeps the shape the builder already consumes (createPlan / saveAsTemplate /
 * deleteTemplate) so the component layer needed no rework: a "plan" and a "template"
 * are both persisted builder designs — plans are simply the newest view of the same data.
 */
import { useState, useEffect, useCallback } from 'react'
import type { WorkoutPlan, WorkoutTemplate, WorkoutGoal, WorkoutExercise, MuscleGroup } from '../types'
import { templateApi } from '@/features/shared/api/client'
import type { TemplateExerciseRow } from '@/features/shared/api/client'

function toExercisesPayload(exercises: WorkoutExercise[]) {
  return exercises.map(e => ({
    name: e.exerciseName,
    sets: e.sets,
    reps: e.reps,
    weightKg: e.weight ?? null,
    restSeconds: e.rest ?? null,
    sortOrder: e.order,
    muscleGroups: e.muscleGroups ?? [],
  }))
}

function mapTemplateExerciseRowToWorkoutExercise(row: TemplateExerciseRow, idx: number): WorkoutExercise {
  const id = typeof row.id === 'string' && row.id ? row.id : `we-${idx}`
  const exerciseId = typeof row.libraryExerciseId === 'string' && row.libraryExerciseId ? row.libraryExerciseId : id
  const exerciseName = String((row.name ?? row.exerciseName ?? '') || `Exercise ${idx + 1}`)
  const rawSets = row.sets
  let sets = 3
  if (Array.isArray(rawSets)) sets = rawSets.length || 1
  else if (typeof rawSets === 'number' && Number.isFinite(rawSets)) sets = rawSets
  else if (typeof rawSets === 'string' && rawSets.trim() !== '') {
    const n = Number(rawSets)
    if (Number.isFinite(n)) sets = n
  }
  const rawReps = row.reps
  let reps: number | 'AMRAP' | 'failure' = 10
  if (typeof rawReps === 'string') {
    if (rawReps === 'AMRAP' || rawReps === 'failure') reps = rawReps
    else {
      const n = Number(rawReps)
      reps = Number.isFinite(n) ? n : 10
    }
  } else if (typeof rawReps === 'number' && Number.isFinite(rawReps)) {
    reps = rawReps
  }
  const weightRaw = (row.weightKg ?? row.weight) as number | null | undefined
  const restRaw = (row.restSeconds ?? row.rest) as number | null | undefined
  const orderRaw = (row.sortOrder ?? row.order) as number | null | undefined
  const weight = typeof weightRaw === 'number' && Number.isFinite(weightRaw) ? weightRaw : undefined
  const rest = typeof restRaw === 'number' && Number.isFinite(restRaw) ? restRaw : 60
  const order = typeof orderRaw === 'number' && Number.isFinite(orderRaw) ? orderRaw : idx + 1
  const mg = Array.isArray(row.muscleGroups) ? (row.muscleGroups as MuscleGroup[]) : []

  return {
    id,
    exerciseId,
    exerciseName,
    order,
    sets,
    reps,
    weight,
    rest,
    muscleGroups: mg,
    notes: typeof row.notes === 'string' ? row.notes : undefined,
  }
}

function mapDetailToWorkoutTemplate(detail: import('@/features/shared/api/client').WorkoutTemplateDetail): WorkoutTemplate {
  const exercises: WorkoutExercise[] = (detail.exercises ?? []).map((ex, i) => mapTemplateExerciseRowToWorkoutExercise(ex, i))
  // Ensure order is sorted
  exercises.sort((a, b) => a.order - b.order)
  return {
    id: detail.id,
    name: detail.name,
    description: detail.description,
    goal: (detail.goal || 'strength') as WorkoutGoal,
    exercises,
    estimatedDuration: detail.estimatedDurationMinutes ?? 0,
    frequency: 'once',
    tags: [],
    createdAt: detail.createdAt.slice(0, 10),
  }
}

export function useWorkoutPlans() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const { templates: remote } = await templateApi.list()
      const mapped: WorkoutTemplate[] = remote.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        goal: (t.goal || 'strength') as WorkoutGoal,
        exercises: [],
        estimatedDuration: t.estimatedDurationMinutes ?? 0,
        frequency: 'once',
        tags: [],
        createdAt: t.createdAt.slice(0, 10),
      }))
      // Hydrate exercises for gallery preview: fetch detail for each template.
      // Keep lightweight fallback on per-item failure so one bad template doesn't break the list.
      const hydrated = await Promise.all(
        mapped.map(async (t) => {
          try {
            const { template } = await templateApi.get(t.id)
            return mapDetailToWorkoutTemplate(template)
          } catch {
            return t
          }
        })
      )
      const nextTemplates = hydrated.length > 0 ? hydrated : mapped
      setTemplates(nextTemplates)
      setPlans(nextTemplates.map(({ frequency: _f, ...rest }) => ({ ...rest, createdAt: rest.createdAt })))
      setError(null)
    } catch {
      setError('No se pudieron cargar las plantillas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    refresh().finally(() => { if (!mounted) return })
    return () => { mounted = false }
  }, [refresh])

  const getTemplateDetail = useCallback(async (id: string): Promise<WorkoutTemplate> => {
    const { template } = await templateApi.get(id)
    const mapped = mapDetailToWorkoutTemplate(template)
    // Keep local cache in sync for the requested template
    setTemplates(prev => {
      const exists = prev.some(t => t.id === id)
      if (!exists) return [...prev, mapped]
      return prev.map(t => (t.id === id ? mapped : t))
    })
    setPlans(prev => prev.map(p => (p.id === id ? { ...mapped, createdAt: mapped.createdAt } : p)))
    return mapped
  }, [])

  const updateTemplate = useCallback(async (id: string, data: { name: string; description: string; goal: WorkoutGoal; exercises: WorkoutExercise[]; estimatedDuration: number; tags?: string[] }) => {
    // Backend upserts when id is provided via POST; we also have a PUT endpoint as fallback.
    try {
      const payload = {
        id,
        name: data.name,
        description: data.description,
        goal: data.goal,
        estimatedDurationMinutes: data.estimatedDuration,
        exercises: toExercisesPayload(data.exercises),
      }
      // Prefer PUT (RESTful) if available, fall back to POST upsert
      try {
        await templateApi.update(id, payload)
      } catch {
        await templateApi.create(payload)
      }
    } catch (e) {
      throw e
    }
    const updated: WorkoutTemplate = {
      id,
      name: data.name,
      description: data.description,
      goal: data.goal,
      exercises: data.exercises,
      estimatedDuration: data.estimatedDuration,
      frequency: 'once',
      tags: data.tags ?? [],
      createdAt: new Date().toISOString().split('T')[0],
    }
    setTemplates(prev => prev.map(t => (t.id === id ? updated : t)))
    setPlans(prev => prev.map(p => (p.id === id ? { ...updated } : p)))
    return updated
  }, [])

  const createPlan = useCallback(async (data: { name: string; description: string; goal: WorkoutGoal; exercises: WorkoutExercise[]; estimatedDuration: number; tags: string[] }) => {
    const { id } = await templateApi.create({
      name: data.name,
      description: data.description,
      goal: data.goal,
      estimatedDurationMinutes: data.estimatedDuration,
      exercises: toExercisesPayload(data.exercises),
    })
    const plan: WorkoutPlan = { ...data, id, createdAt: new Date().toISOString().split('T')[0] }
    setPlans(prev => [plan, ...prev])
    await refresh()
    return plan
  }, [refresh])

  const saveAsTemplate = useCallback(async (plan: WorkoutPlan, _frequency: 'once' | 'daily' | 'weekly' | 'custom') => {
    const { id } = await templateApi.create({
      name: plan.name,
      description: plan.description,
      goal: plan.goal,
      estimatedDurationMinutes: plan.estimatedDuration,
      exercises: toExercisesPayload(plan.exercises),
    })
    const template: WorkoutTemplate = {
      id, name: plan.name, description: plan.description,
      goal: plan.goal, exercises: plan.exercises, estimatedDuration: plan.estimatedDuration,
      frequency: 'once', tags: plan.tags, createdAt: new Date().toISOString().split('T')[0],
    }
    setTemplates(prev => [template, ...prev])
    return template
  }, [])

  const deletePlan = useCallback(async (id: string) => {
    await templateApi.remove(id)
    setPlans(prev => prev.filter(p => p.id !== id))
    setTemplates(prev => prev.filter(t => t.id !== id))
  }, [])

  const deleteTemplate = useCallback(async (id: string) => {
    await templateApi.remove(id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    setPlans(prev => prev.filter(p => p.id !== id))
  }, [])

  return { plans, templates, loading, error, createPlan, saveAsTemplate, deletePlan, deleteTemplate, refresh, getTemplateDetail, updateTemplate }
}
