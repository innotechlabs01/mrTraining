'use client';

import { motion } from 'framer-motion';
import { GripVertical, Timer, Dumbbell, Weight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Exercise } from '../../types';

interface ExerciseBlockProps {
  exercise: Exercise;
  day: string;
}

export default function ExerciseBlock({ exercise, day }: ExerciseBlockProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'glass-card group flex items-center gap-3 rounded-lg px-4 py-3',
        'hover:bg-white/[0.08] hover:border-white/[0.12]',
        'transition-all duration-200 cursor-default',
      )}
    >
      <div className="shrink-0 cursor-grab text-[#6B7280]/40 transition-colors group-hover:text-[#6B7280]/70">
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-3.5 w-3.5 text-brand-primary shrink-0" />
          <span className="truncate text-sm font-medium text-white">
            {exercise.name}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
          <span>
            {exercise.sets} × {exercise.reps} reps
          </span>
          <span className="flex items-center gap-1">
            <Timer className="h-3 w-3" />
            {exercise.rest}s rest
          </span>
          {exercise.weight != null && (
            <span className="flex items-center gap-1">
              <Weight className="h-3 w-3" />
              {exercise.weight}kg
            </span>
          )}
        </div>
      </div>

      {exercise.notes && (
        <span className="hidden shrink-0 text-xs text-[#6B7280]/60 sm:block">
          {exercise.notes}
        </span>
      )}
    </motion.div>
  );
}
