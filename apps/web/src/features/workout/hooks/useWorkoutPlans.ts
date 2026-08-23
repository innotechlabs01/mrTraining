'use client'

/**
 * Real workout templates, backed by /api/coach/workout-templates (migration 014).
 * The hook keeps the shape the builder already consumes (createPlan / saveAsTemplate /
 * deleteTemplate) so the component layer needed no rework: a "plan" and a "template"
 * are both persisted builder designs — plans are simply the newest view of the same data.
 */
import { useState, useEffect, useCallback } from 'react'
import type { WorkoutPlan, WorkoutTemplate, WorkoutGoal, WorkoutExercise } from '../types'
import { templateApi } from '@/features/shared/api/client'

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

export function useWorkoutPlans() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
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
      // Plans mirror templates (same persisted entity, different listing lens).
      setTemplates(mapped)
      setPlans(mapped.map(({ frequency: _f, ...rest }) => ({ ...rest, createdAt: rest.createdAt })))
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

  return { plans, templates, loading, error, createPlan, saveAsTemplate, deletePlan, deleteTemplate }
}
