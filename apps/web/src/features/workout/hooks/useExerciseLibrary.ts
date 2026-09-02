'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Exercise, MuscleGroup, Equipment, Difficulty } from '../types'
import { exerciseApi, type ExerciseLibraryEntry } from '@/features/shared/api/client'

// Map a DB/API library row onto the UI Exercise shape.
function toExercise(e: ExerciseLibraryEntry): Exercise {
  return {
    id: e.id,
    name: e.name,
    description: e.description,
    muscleGroups: (Array.isArray(e.muscleGroups) ? e.muscleGroups : []) as MuscleGroup[],
    equipment: (e.equipment ?? 'bodyweight') as Equipment,
    difficulty: (e.difficulty ?? 'beginner') as Difficulty,
    instructions: Array.isArray(e.instructions) ? e.instructions : [],
    videoUrl: e.videoUrl ?? undefined,
    createdAt: '',
  }
}

// Map UI Exercise back to a partial library entry for create/update.
function fromExercise(e: Partial<Exercise>): Partial<ExerciseLibraryEntry> {
  return {
    name: e.name,
    description: e.description,
    mode: 'reps',
    muscleGroups: e.muscleGroups,
    equipment: e.equipment,
    difficulty: e.difficulty,
    category: 'compound',
    instructions: e.instructions,
    videoUrl: e.videoUrl,
  }
}

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
    exerciseApi
      .list()
      .then(({ exercises: list }) => {
        if (!mounted) return
        setExercises(list.map(toExercise))
        setError(null)
      })
      .catch(() => {
        if (!mounted) return
        setError('No se pudo cargar la biblioteca de ejercicios')
      })
      .finally(() => { if (!mounted) return; setLoading(false) })
    return () => { mounted = false }
  }, [])

  const filtered = exercises.filter(ex => {
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase()) && !ex.description.toLowerCase().includes(search.toLowerCase())) return false
    if (filterMuscle !== 'all' && !ex.muscleGroups.includes(filterMuscle)) return false
    if (filterEquipment !== 'all' && ex.equipment !== filterEquipment) return false
    return true
  })

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { exercises: list } = await exerciseApi.list()
      setExercises(list.map(toExercise))
      setError(null)
    } catch {
      setError('No se pudo cargar la biblioteca de ejercicios')
    } finally {
      setLoading(false)
    }
  }, [])

  const createExercise = useCallback(async (data: Omit<Exercise, 'id' | 'createdAt'>) => {
    try {
      const { exercise } = await exerciseApi.create(fromExercise(data))
      const created = toExercise(exercise)
      setExercises(prev => [created, ...prev])
      return created
    } catch {
      throw new Error('No se pudo crear el ejercicio')
    }
  }, [])

  const updateExercise = useCallback(async (id: string, data: Partial<Exercise>) => {
    try {
      const { exercise } = await exerciseApi.update(id, fromExercise(data))
      const updated = toExercise(exercise)
      setExercises(prev => prev.map(ex => ex.id === id ? updated : ex))
    } catch {
      throw new Error('No se pudo actualizar el ejercicio')
    }
  }, [])

  const deleteExercise = useCallback(async (id: string) => {
    try {
      await exerciseApi.remove(id)
      setExercises(prev => prev.filter(ex => ex.id !== id))
    } catch {
      throw new Error('No se pudo eliminar el ejercicio')
    }
  }, [])

  return { exercises: filtered, allExercises: exercises, loading, error, search, setSearch, filterMuscle, setFilterMuscle, filterEquipment, setFilterEquipment, createExercise, updateExercise, deleteExercise, refresh }
}