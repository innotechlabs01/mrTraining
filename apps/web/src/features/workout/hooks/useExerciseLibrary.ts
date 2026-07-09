'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Exercise, MuscleGroup, Equipment, Difficulty } from '../types'
import { MOCK_EXERCISES } from '../data/_mocks'
import { generateId } from './helpers'

export function useExerciseLibrary() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [search, setSearch] = useState('')
  const [filterMuscle, setFilterMuscle] = useState<MuscleGroup | 'all'>('all')
  const [filterEquipment, setFilterEquipment] = useState<Equipment | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    const timer = setTimeout(() => {
      if (!mounted) return
      setExercises(MOCK_EXERCISES)
      setLoading(false)
    }, 500)
    return () => { mounted = false; clearTimeout(timer) }
  }, [])

  const filtered = exercises.filter(ex => {
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase()) && !ex.description.toLowerCase().includes(search.toLowerCase())) return false
    if (filterMuscle !== 'all' && !ex.muscleGroups.includes(filterMuscle)) return false
    if (filterEquipment !== 'all' && ex.equipment !== filterEquipment) return false
    return true
  })

  const createExercise = useCallback(async (data: Omit<Exercise, 'id' | 'createdAt'>) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    const exercise: Exercise = { ...data, id: generateId('ex'), createdAt: new Date().toISOString().split('T')[0] }
    setExercises(prev => [exercise, ...prev])
    setLoading(false)
    return exercise
  }, [])

  const updateExercise = useCallback(async (id: string, data: Partial<Exercise>) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, ...data } : ex))
    setLoading(false)
  }, [])

  const deleteExercise = useCallback(async (id: string) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 200))
    setExercises(prev => prev.filter(ex => ex.id !== id))
    setLoading(false)
  }, [])

  return { exercises: filtered, allExercises: exercises, loading, error, search, setSearch, filterMuscle, setFilterMuscle, filterEquipment, setFilterEquipment, createExercise, updateExercise, deleteExercise }
}
