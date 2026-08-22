'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExerciseDetail, MuscleGroup, Equipment, Difficulty, ExerciseCategory } from '../types'
import { EXERCISE_CATEGORY_LABELS } from '../data/_mocks'
import { exerciseApi, type ExerciseLibraryEntry } from '@/features/shared/api/client'
import { MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS } from '../hooks/helpers'
import { ExerciseCard } from './ExerciseCard'
import { cn } from '@/lib/utils'
import { Search, Filter, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'

interface ExerciseLibraryProps {
  onAddExercise?: (exercise: ExerciseDetail) => void
  selectedExercises?: string[] // IDs of exercises already in workout
  className?: string
}

const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs',
  'glutes', 'hamstrings', 'quads', 'calves', 'core', 'full_body'
]

const ALL_EQUIPMENT: Equipment[] = [
  'barbell', 'dumbbell', 'kettlebell', 'machine', 'cable',
  'bodyweight', 'bands', 'medicine_ball', 'smith_machine'
]

const ALL_CATEGORIES: ExerciseCategory[] = [
  'compound', 'isolation', 'plyometric', 'cardio', 'bodyweight', 'warm_up', 'cool_down', 'core'
]

const ALL_DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced']

// Map a DB library row onto the UI's ExerciseDetail shape. Fields the catalog does not
// carry (tips, mistakes, video) stay empty rather than being invented here.
function toExerciseDetail(e: ExerciseLibraryEntry): ExerciseDetail {
  return {
    id: e.id,
    name: e.name,
    description: e.description,
    muscleGroups: e.muscleGroups as MuscleGroup[],
    secondaryMuscles: e.secondaryMuscles as MuscleGroup[],
    equipment: (e.equipment ?? 'bodyweight') as Equipment,
    difficulty: (e.difficulty ?? 'beginner') as Difficulty,
    category: (e.category ?? 'compound') as ExerciseCategory,
    instructions: e.instructions,
    tips: [],
    commonMistakes: [],
    videoUrl: '',
    createdAt: e.isCustom ? '' : '2026-06-01',
  } as ExerciseDetail
}

export function ExerciseLibrary({
  onAddExercise,
  selectedExercises = [],
  className,
}: ExerciseLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedMuscles, setSelectedMuscles] = useState<MuscleGroup[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment[]>([])
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'muscle' | 'difficulty'>('name')
  // Real data from /api/exercises — global library plus this coach's custom exercises.
  const [exercises, setExercises] = useState<ExerciseDetail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    exerciseApi.list()
      .then(({ exercises }) => { if (!cancelled) setExercises(exercises.map(toExerciseDetail)) })
      .catch(() => { if (!cancelled) setLoadError('No se pudo cargar la biblioteca de ejercicios') })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filteredExercises = useMemo(() => {
    let results = [...exercises]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      results = results.filter(ex =>
        ex.name.toLowerCase().includes(query) ||
        ex.description.toLowerCase().includes(query) ||
        ex.muscleGroups.some(m => m.toLowerCase().includes(query)) ||
        ex.equipment.toLowerCase().includes(query)
      )
    }

    // Muscle group filter
    if (selectedMuscles.length > 0) {
      results = results.filter(ex =>
        ex.muscleGroups.some(m => selectedMuscles.includes(m))
      )
    }

    // Equipment filter
    if (selectedEquipment.length > 0) {
      results = results.filter(ex => selectedEquipment.includes(ex.equipment))
    }

    // Category filter
    if (selectedCategory) {
      results = results.filter(ex => ex.category === selectedCategory)
    }

    // Difficulty filter
    if (selectedDifficulty) {
      results = results.filter(ex => ex.difficulty === selectedDifficulty)
    }

    // Sorting
    results.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'muscle':
          return a.muscleGroups[0].localeCompare(b.muscleGroups[0])
        case 'difficulty':
          const diffOrder = { beginner: 0, intermediate: 1, advanced: 2 }
          return diffOrder[a.difficulty] - diffOrder[b.difficulty]
        default:
          return 0
      }
    })

    return results
  }, [searchQuery, selectedMuscles, selectedEquipment, selectedCategory, selectedDifficulty, sortBy])

  const activeFilterCount = [
    selectedMuscles.length,
    selectedEquipment.length,
    selectedCategory ? 1 : 0,
    selectedDifficulty ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const clearFilters = () => {
    setSelectedMuscles([])
    setSelectedEquipment([])
    setSelectedCategory(null)
    setSelectedDifficulty(null)
    setSearchQuery('')
  }

  const toggleMuscle = (muscle: MuscleGroup) => {
    setSelectedMuscles(prev =>
      prev.includes(muscle)
        ? prev.filter(m => m !== muscle)
        : [...prev, muscle]
    )
  }

  const toggleEquipment = (equipment: Equipment) => {
    setSelectedEquipment(prev =>
      prev.includes(equipment)
        ? prev.filter(e => e !== equipment)
        : [...prev, equipment]
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Search & Filter Bar */}
      <div className="flex-shrink-0 p-4 border-b border-[#2A2A2C]">
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgba(255,255,255,0.4)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exercises..."
              className="w-full h-11 pl-10 pr-4 rounded-lg bg-[#141416] border border-[#2A2A2C] text-[#FFFFFF] placeholder-[rgba(255,255,255,0.4)] focus:outline-none focus:border-[#0066FF] transition-colors"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 h-11 px-4 rounded-lg border transition-colors',
              showFilters ? 'bg-[#0066FF] border-[#0066FF] text-white' :
              'bg-[#141416] border-[#2A2A2C] text-[rgba(255,255,255,0.7)] hover:border-[#242426]'
            )}
          >
            <Filter className="w-5 h-5" />
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full bg-[#FF6B00] text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="h-11 px-3 pr-8 rounded-lg bg-[#141416] border border-[#2A2A2C] text-[rgba(255,255,255,0.7)] focus:outline-none focus:border-[#0066FF] appearance-none cursor-pointer"
            >
              <option value="name">Name</option>
              <option value="muscle">Muscle</option>
              <option value="difficulty">Difficulty</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(255,255,255,0.4)] pointer-events-none" />
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-4">
                {/* Clear Filters */}
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-[#0066FF] hover:underline"
                  >
                    Clear all filters
                  </button>
                )}

                {/* Muscle Groups */}
                <div>
                  <p className="text-xs font-medium text-[rgba(255,255,255,0.4)] uppercase tracking-wide mb-2">
                    Muscle Groups
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_MUSCLE_GROUPS.map(muscle => (
                      <button
                        key={muscle}
                        onClick={() => toggleMuscle(muscle)}
                        className={cn(
                          'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors',
                          selectedMuscles.includes(muscle)
                            ? 'bg-[#FF6B00] border-[#FF6B00] text-white'
                            : 'bg-[#141416] border-[#2A2A2C] text-[rgba(255,255,255,0.7)] hover:border-[#242426]'
                        )}
                      >
                        {MUSCLE_GROUP_LABELS[muscle]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Equipment */}
                <div>
                  <p className="text-xs font-medium text-[rgba(255,255,255,0.4)] uppercase tracking-wide mb-2">
                    Equipment
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_EQUIPMENT.map(equipment => (
                      <button
                        key={equipment}
                        onClick={() => toggleEquipment(equipment)}
                        className={cn(
                          'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors',
                          selectedEquipment.includes(equipment)
                            ? 'bg-[#0066FF] border-[#0066FF] text-white'
                            : 'bg-[#141416] border-[#2A2A2C] text-[rgba(255,255,255,0.7)] hover:border-[#242426]'
                        )}
                      >
                        {EQUIPMENT_LABELS[equipment]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <p className="text-xs font-medium text-[rgba(255,255,255,0.4)] uppercase tracking-wide mb-2">
                    Category
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_CATEGORIES.map(category => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                        className={cn(
                          'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors',
                          selectedCategory === category
                            ? 'bg-[#FF6B00] border-[#FF6B00] text-white'
                            : 'bg-[#141416] border-[#2A2A2C] text-[rgba(255,255,255,0.7)] hover:border-[#242426]'
                        )}
                      >
                        {EXERCISE_CATEGORY_LABELS[category]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <p className="text-xs font-medium text-[rgba(255,255,255,0.4)] uppercase tracking-wide mb-2">
                    Difficulty
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_DIFFICULTIES.map(difficulty => (
                      <button
                        key={difficulty}
                        onClick={() => setSelectedDifficulty(selectedDifficulty === difficulty ? null : difficulty)}
                        className={cn(
                          'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors capitalize',
                          selectedDifficulty === difficulty
                            ? 'bg-[#FF6B00] border-[#FF6B00] text-white'
                            : 'bg-[#141416] border-[#2A2A2C] text-[rgba(255,255,255,0.7)] hover:border-[#242426]'
                        )}
                      >
                        {difficulty}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Count */}
      <div className="flex-shrink-0 px-4 py-2 text-sm text-[rgba(255,255,255,0.7)]">
        {loadError
          ? loadError
          : isLoading
            ? 'Cargando ejercicios…'
            : `${filteredExercises.length} ejercicio${filteredExercises.length !== 1 ? 's' : ''}${selectedExercises.length > 0 ? ` (${selectedExercises.length} seleccionados)` : ''}`}
      </div>

      {/* Exercise List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {isLoading || loadError ? null : filteredExercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Search className="w-12 h-12 text-[rgba(255,255,255,0.4)] mb-3" />
            <p className="text-lg font-medium text-[#FFFFFF]">No exercises found</p>
            <p className="text-sm text-[rgba(255,255,255,0.7)] mt-1">
              Try adjusting your filters or search query
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-4 text-sm text-[#0066FF] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filteredExercises.map((exercise, index) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onAdd={onAddExercise}
              selected={selectedExercises.includes(exercise.id)}
              variant={onAddExercise ? 'selectable' : 'default'}
              showDetails={showFilters}
            />
          ))
        )}
      </div>
    </div>
  )
}