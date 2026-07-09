'use client'

import { useState, useEffect, useCallback } from 'react'
import type { WorkoutPlan, WorkoutTemplate, WorkoutGoal, WorkoutExercise } from '../types'
import { MOCK_WORKOUTS, MOCK_TEMPLATES } from '../data/_mocks'
import { generateId } from './helpers'

export function useWorkoutPlans() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const timer = setTimeout(() => {
      if (!mounted) return
      setPlans(MOCK_WORKOUTS)
      setTemplates(MOCK_TEMPLATES)
      setLoading(false)
    }, 600)
    return () => { mounted = false; clearTimeout(timer) }
  }, [])

  const createPlan = useCallback(async (data: { name: string; description: string; goal: WorkoutGoal; exercises: WorkoutExercise[]; estimatedDuration: number; tags: string[] }) => {
    await new Promise(r => setTimeout(r, 300))
    const plan: WorkoutPlan = { ...data, id: generateId('wp'), createdAt: new Date().toISOString().split('T')[0] }
    setPlans(prev => [plan, ...prev])
    return plan
  }, [])

  const saveAsTemplate = useCallback(async (plan: WorkoutPlan, frequency: 'once' | 'daily' | 'weekly' | 'custom') => {
    await new Promise(r => setTimeout(r, 300))
    const template: WorkoutTemplate = {
      id: generateId('wt'), name: plan.name, description: plan.description,
      goal: plan.goal, exercises: plan.exercises, estimatedDuration: plan.estimatedDuration,
      frequency, tags: plan.tags, createdAt: new Date().toISOString().split('T')[0],
    }
    setTemplates(prev => [template, ...prev])
    return template
  }, [])

  const deletePlan = useCallback(async (id: string) => {
    await new Promise(r => setTimeout(r, 200))
    setPlans(prev => prev.filter(p => p.id !== id))
  }, [])

  const deleteTemplate = useCallback(async (id: string) => {
    await new Promise(r => setTimeout(r, 200))
    setTemplates(prev => prev.filter(t => t.id !== id))
  }, [])

  return { plans, templates, loading, error, createPlan, saveAsTemplate, deletePlan, deleteTemplate }
}
