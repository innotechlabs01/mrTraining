'use client'

import { motion } from 'framer-motion'
import { Workout, WorkoutHistoryEntry } from '../types'
import { formatDuration, formatDate } from '../hooks/helpers'
import { WORKOUT_GOAL_LABELS, WORKOUT_TYPE_LABELS } from '../data/_mocks'
import { cn } from '@/lib/utils'
import { Play, Clock, Target, ChevronRight, CheckCircle2, Circle, AlertCircle, MoreVertical } from 'lucide-react'

interface WorkoutCardProps {
  workout: Workout
  onStart?: (workout: Workout) => void
  onView?: (workout: Workout) => void
  onEdit?: (workout: Workout) => void
  variant?: 'default' | 'compact' | 'inline'
  showActions?: boolean
  className?: string
}

export function WorkoutCard({
  workout,
  onStart,
  onView,
  onEdit,
  variant = 'default',
  showActions = true,
  className,
}: WorkoutCardProps) {
  const isCompact = variant === 'compact'
  const isInline = variant === 'inline'

  const getStatusIcon = () => {
    switch (workout.status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'in_progress':
        return <AlertCircle className="w-4 h-4 text-amber-500" />
      case 'scheduled':
        return <Circle className="w-4 h-4 text-blue-500" />
      case 'missed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Circle className="w-4 h-4 text-[rgba(255,255,255,0.4)]" />
    }
  }

  const getStatusColor = () => {
    switch (workout.status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'in_progress':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'scheduled':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'missed':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-[#1C1C1C] text-[rgba(255,255,255,0.7)] border-[#2A2A2C]'
    }
  }

  if (isInline) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg bg-[#1A1A1C] border border-[#2A2A2C]',
          'hover:border-[#242426] transition-colors cursor-pointer',
          className
        )}
        onClick={() => onView?.(workout)}
      >
        <div className="flex-shrink-0">
          {getStatusIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#FFFFFF] truncate">{workout.name}</p>
          <p className="text-sm text-[rgba(255,255,255,0.7)]">
            {workout.exercises.length} exercises • {formatDuration(workout.estimatedDuration)}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-[rgba(255,255,255,0.4)]" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group relative rounded-lg border border-[#2A2A2C] bg-[#1A1A1C]',
        'hover:border-[#242426] hover:shadow-md transition-all duration-200',
        className
      )}
    >
      <div className={cn('flex gap-4', isCompact ? 'p-3' : 'p-4')}>
        {/* Status / Thumbnail */}
        <div className={cn(
          'flex-shrink-0 rounded-lg flex items-center justify-center',
          isCompact ? 'w-12 h-12' : 'w-20 h-20',
          workout.status === 'completed' ? 'bg-green-500/20' :
          workout.status === 'in_progress' ? 'bg-amber-500/20' :
          workout.status === 'missed' ? 'bg-red-500/20' :
          'bg-[#1C1C1C]'
        )}>
          {workout.status === 'completed' ? (
            <CheckCircle2 className={cn('text-green-500', isCompact ? 'w-6 h-6' : 'w-10 h-10')} />
          ) : workout.status === 'in_progress' ? (
            <Play className={cn('text-amber-500', isCompact ? 'w-5 h-5' : 'w-8 h-8')} />
          ) : (
            <Target className={cn('text-[rgba(255,255,255,0.4)]', isCompact ? 'w-5 h-5' : 'w-8 h-8')} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className={cn(
                'font-semibold text-[#FFFFFF]',
                isCompact ? 'text-sm' : 'text-lg'
              )}>
                {workout.name}
              </h3>
              {!isCompact && workout.description && (
                <p className="mt-1 text-sm text-[rgba(255,255,255,0.7)] line-clamp-2">
                  {workout.description}
                </p>
              )}
            </div>
            <span className={cn(
              'flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full border',
              getStatusColor()
            )}>
              {workout.status.replace('_', ' ')}
            </span>
          </div>

          {/* Meta */}
          <div className={cn('flex flex-wrap gap-3 mt-2', isCompact ? 'gap-2' : '')}>
            <div className="flex items-center gap-1 text-sm text-[rgba(255,255,255,0.7)]">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(workout.estimatedDuration)}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-[rgba(255,255,255,0.7)]">
              <Target className="w-4 h-4" />
              <span>{WORKOUT_GOAL_LABELS[workout.goal]}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-[rgba(255,255,255,0.4)]">
              <span>{workout.exercises.length} exercises</span>
            </div>
          </div>

          {/* Tags */}
          {!isCompact && workout.tags && workout.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {workout.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#1C1C1C] text-[rgba(255,255,255,0.7)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className={cn(
          'flex items-center justify-end gap-2 px-4 pb-4',
          !isCompact && 'border-t border-[#2A2A2C] mt-0 pt-3'
        )}>
          {onEdit && (
            <button
              onClick={() => onEdit(workout)}
              className="px-3 py-1.5 text-sm font-medium text-[rgba(255,255,255,0.7)] hover:text-[#FFFFFF] hover:bg-[#1C1C1C] rounded-md transition-colors"
            >
              Edit
            </button>
          )}
          {onView && (
            <button
              onClick={() => onView(workout)}
              className="px-3 py-1.5 text-sm font-medium text-[rgba(255,255,255,0.7)] hover:text-[#FFFFFF] hover:bg-[#1C1C1C] rounded-md transition-colors"
            >
              View
            </button>
          )}
          {onStart && workout.status !== 'completed' && (
            <button
              onClick={() => onStart(workout)}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-[#FF6B00] text-[#0A0B0D] rounded-md hover:bg-[#FF6B00]/90 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

// History card - simpler version for workout history
export function WorkoutHistoryCard({
  entry,
  onClick,
}: {
  entry: WorkoutHistoryEntry
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg bg-[#1A1A1C] border border-[#2A2A2C]',
        'hover:border-[#242426] hover:shadow-sm transition-all cursor-pointer'
      )}
    >
      {/* Date */}
      <div className="flex-shrink-0 w-12 text-center">
        <p className="text-xs text-[rgba(255,255,255,0.4)] uppercase">
          {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
        </p>
        <p className="text-xl font-bold text-[#FFFFFF]">
          {new Date(entry.date + 'T12:00:00').getDate()}
        </p>
      </div>

      {/* Divider */}
      <div className="w-px h-12 bg-[#2A2A2C]" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-medium text-[#FFFFFF] truncate">{entry.workoutName}</h4>
          <span className={cn(
            'px-2 py-0.5 text-xs font-medium rounded-full',
            entry.status === 'completed' && 'bg-green-500/20 text-green-400',
            entry.status === 'missed' && 'bg-red-500/20 text-red-400',
            entry.status === 'in_progress' && 'bg-amber-500/20 text-amber-400'
          )}>
            {entry.status}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-[rgba(255,255,255,0.7)]">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {entry.duration} min
          </span>
          <span>{entry.exercisesCompleted}/{entry.exercisesTotal} exercises</span>
          {entry.rpe && <span>RPE {entry.rpe}</span>}
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-[rgba(255,255,255,0.4)]" />
    </div>
  )
}