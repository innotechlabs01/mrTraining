'use client'

import { motion } from 'framer-motion'
import { ExerciseDetail, MuscleGroup, Equipment, Difficulty, ExerciseCategory } from '../types'
import { MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS } from '../hooks/helpers'
import { cn } from '@/lib/utils'
import { Play, Plus, Info } from 'lucide-react'

// Extended labels matching the new types
const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  compound: 'Compound',
  isolation: 'Isolation',
  plyometric: 'Plyometric',
  cardio: 'Cardio',
  bodyweight: 'Bodyweight',
  warm_up: 'Warm Up',
  cool_down: 'Cool Down',
  core: 'Core',
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

const MUSCLE_COLORS: Record<string, string> = {
  chest: '#FF6B00',
  back: '#0066FF',
  shoulders: '#00C853',
  biceps: '#FF3D00',
  triceps: '#FFB300',
  legs: '#9C27B0',
  glutes: '#E91E63',
  hamstrings: '#00BCD4',
  quads: '#8BC34A',
  calves: '#795548',
  core: '#607D8B',
  full_body: '#FF9800',
}

interface ExerciseCardProps {
  exercise: ExerciseDetail
  onSelect?: (exercise: ExerciseDetail) => void
  onAdd?: (exercise: ExerciseDetail) => void
  onViewDetails?: (exercise: ExerciseDetail) => void
  variant?: 'default' | 'compact' | 'selectable'
  showDetails?: boolean
  selected?: boolean
  className?: string
}

export function ExerciseCard({
  exercise,
  onSelect,
  onAdd,
  onViewDetails,
  variant = 'default',
  showDetails = false,
  selected = false,
  className,
}: ExerciseCardProps) {
  const isCompact = variant === 'compact'
  const isSelectable = variant === 'selectable'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group relative rounded-lg border border-[#2A2A2C] bg-[#1A1A1C] transition-all duration-200',
        isSelectable && selected && 'ring-2 ring-[#FF6B00] border-[#FF6B00]',
        isSelectable && 'cursor-pointer hover:border-[#242426]',
        !isSelectable && 'hover:border-[#242426] hover:shadow-md',
        className
      )}
      onClick={() => isSelectable && onSelect?.(exercise)}
    >
      {/* Header */}
      <div className={cn('flex items-start gap-3', isCompact ? 'p-3' : 'p-4')}>
        {/* Thumbnail */}
        {!isCompact && (
          <div className="relative flex-shrink-0 w-16 h-16 rounded-md bg-[#1C1C1C] overflow-hidden">
            {exercise.thumbnailUrl ? (
              <img src={exercise.thumbnailUrl} alt={exercise.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <Play className="w-6 h-6 text-[rgba(255,255,255,0.4)]" />
              </div>
            )}
            {exercise.videoUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn(
              'font-semibold text-[#FFFFFF] truncate',
              isCompact ? 'text-sm' : 'text-base'
            )}>
              {exercise.name}
            </h3>
            <span className={cn(
              'flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full',
              exercise.difficulty === 'beginner' && 'bg-green-500/20 text-green-400',
              exercise.difficulty === 'intermediate' && 'bg-yellow-500/20 text-yellow-400',
              exercise.difficulty === 'advanced' && 'bg-red-500/20 text-red-400'
            )}>
              {DIFFICULTY_LABELS[exercise.difficulty]}
            </span>
          </div>

          {!isCompact && (
            <p className="mt-1 text-sm text-[rgba(255,255,255,0.7)] line-clamp-2">
              {exercise.description}
            </p>
          )}

          {/* Muscle Groups */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {exercise.muscleGroups.slice(0, isCompact ? 2 : 4).map((muscle) => (
              <span
                key={muscle}
                className="px-2 py-0.5 text-xs font-medium rounded-full"
                style={{
                  backgroundColor: `${MUSCLE_COLORS[muscle]}20`,
                  color: MUSCLE_COLORS[muscle],
                }}
              >
                {MUSCLE_GROUP_LABELS[muscle] || muscle}
              </span>
            ))}
            {exercise.muscleGroups.length > (isCompact ? 2 : 4) && (
              <span className="px-2 py-0.5 text-xs text-[rgba(255,255,255,0.4)]">
                +{exercise.muscleGroups.length - (isCompact ? 2 : 4)}
              </span>
            )}
          </div>

          {/* Equipment & Category */}
          {!isCompact && (
            <div className="mt-2 flex items-center gap-3 text-xs text-[rgba(255,255,255,0.4)]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
                {EQUIPMENT_LABELS[exercise.equipment] || exercise.equipment}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
                {CATEGORY_LABELS[exercise.category] || exercise.category}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isSelectable && (
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onAdd && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onAdd(exercise)
                }}
                className="p-1.5 rounded-md bg-[#FF6B00] text-[#0A0B0D] hover:bg-[#FF6B00]/90 transition-colors"
                aria-label="Add exercise to workout"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            {onViewDetails && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onViewDetails(exercise)
                }}
                className="p-1.5 rounded-md bg-[#1C1C1C] text-[rgba(255,255,255,0.7)] hover:bg-[#242426] transition-colors"
                aria-label="View exercise details"
              >
                <Info className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tips (shown on hover or when showDetails is true) */}
      {showDetails && exercise.tips && exercise.tips.length > 0 && (
        <div className="px-4 pb-4 border-t border-[#2A2A2C] mt-2 pt-3">
          <p className="text-xs font-medium text-[rgba(255,255,255,0.4)] mb-1.5">Tips</p>
          <ul className="space-y-1">
            {exercise.tips.slice(0, 2).map((tip, idx) => (
              <li key={idx} className="text-xs text-[rgba(255,255,255,0.7)]">
                • {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}

// Compact version for inline display
export function ExerciseCardCompact({
  exercise,
  onRemove,
}: {
  exercise: ExerciseDetail
  onRemove?: () => void
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#1A1A1C] border border-[#2A2A2C]">
      <div className="w-8 h-8 rounded bg-[#1C1C1C] flex items-center justify-center flex-shrink-0">
        <Play className="w-4 h-4 text-[rgba(255,255,255,0.4)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#FFFFFF] truncate">
          {exercise.name}
        </p>
        <p className="text-xs text-[rgba(255,255,255,0.4)]">
          {exercise.muscleGroups.slice(0, 2).map(m => MUSCLE_GROUP_LABELS[m] || m).join(', ')}
        </p>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-1 text-[rgba(255,255,255,0.4)] hover:text-[#FF3D00] transition-colors"
        >
          ×
        </button>
      )}
    </div>
  )
}