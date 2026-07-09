'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Dumbbell, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessions } from '../../hooks/useSessions';
import ExerciseBlock from './ExerciseBlock';
import AiGenerationModal from './AiGenerationModal';
import type { AiGeneratedProgram, Exercise } from '../../types';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DayData {
  label: string;
  exercises: Exercise[];
  hasSession: boolean;
}

function buildWeekData(sessions: ReturnType<typeof useSessions>['sessions']): DayData[] {
  const grouped = new Map<string, Exercise[]>();

  for (const session of sessions) {
    for (const ex of session.exercises) {
      const dayIndex = sessions.indexOf(session) % DAY_LABELS.length;
      const dayLabel = DAY_LABELS[dayIndex];
      const existing = grouped.get(dayLabel) || [];
      existing.push(ex);
      grouped.set(dayLabel, existing);
    }
  }

  return DAY_LABELS.map((label) => ({
    label,
    exercises: grouped.get(label) || [],
    hasSession: (grouped.get(label)?.length ?? 0) > 0,
  }));
}

export default function ProgramDesign() {
  const { sessions, isLoading, error } = useSessions();
  const [activeDay, setActiveDay] = useState(() => {
    const today = new Date().getDay();
    return DAY_LABELS[today === 0 ? 6 : today - 1];
  });
  const [showAiModal, setShowAiModal] = useState(false);
  const [weekData, setWeekData] = useState<DayData[]>(() => buildWeekData(sessions));

  const activeDayData = weekData.find((d) => d.label === activeDay)!;

  const handleAiApply = useCallback(
    (program: AiGeneratedProgram) => {
      const newWeek = weekData.map((day) => {
        const match = program.sessions.find((s) => s.day === day.label);
        if (match) {
          return { ...day, exercises: match.exercises, hasSession: true };
        }
        return day;
      });
      setWeekData(newWeek);
      setShowAiModal(false);
    },
    [weekData],
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-surface-1 p-12">
        <AlertCircle className="h-8 w-8 text-error" />
        <p className="text-sm text-secondary">Failed to load program data</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
        >
          <RefreshCw className="mr-2 inline h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-3" />
        <div className="flex gap-2">
          {DAY_LABELS.map((d) => (
            <div key={d} className="h-9 w-14 animate-pulse rounded-lg bg-surface-3" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-surface-2" />
          ))}
        </div>
      </div>
    );
  }

  const hasExercises = weekData.some((d) => d.exercises.length > 0);

  if (!hasExercises) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 rounded-xl bg-surface-1 p-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-3">
          <Dumbbell className="h-8 w-8 text-[#6B7280]" />
        </div>
        <div className="text-center">
          <p className="text-base font-medium text-white">No program yet</p>
          <p className="mt-1 text-sm text-[#6B7280]">Generate or build one to get started</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-secondary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-brand-secondary/90"
          >
            <Sparkles className="h-4 w-4" />
            AI Generate Program
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-dashed border-white/20 px-5 py-2.5 text-sm font-medium text-secondary transition-all duration-200 hover:border-white/30 hover:text-white"
          >
            <Plus className="h-4 w-4" />
            Add Session
          </button>
        </div>
        <AnimatePresence>
          {showAiModal && (
            <AiGenerationModal onClose={() => setShowAiModal(false)} onApply={handleAiApply} />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold font-display text-white">Weekly Program</h2>
        <button
          type="button"
          onClick={() => setShowAiModal(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-secondary px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-brand-secondary/90"
        >
          <Sparkles className="h-4 w-4" />
          AI Generate
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {weekData.map((day) => (
          <button
            key={day.label}
            type="button"
            onClick={() => setActiveDay(day.label)}
            className={cn(
              'relative shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
              activeDay === day.label
                ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                : 'bg-surface-2 text-secondary hover:bg-surface-3 hover:text-white',
            )}
          >
            {day.label}
            {day.hasSession && activeDay !== day.label && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-success" />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeDay}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="space-y-3"
        >
          {activeDayData.exercises.map((exercise) => (
            <ExerciseBlock key={exercise.id} exercise={exercise} day={activeDay} />
          ))}

          <button
            type="button"
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/10 px-4 py-4',
              'text-sm font-medium text-[#6B7280]',
              'transition-all duration-200 hover:border-white/20 hover:text-secondary',
            )}
          >
            <Plus className="h-4 w-4" />
            Add Session
          </button>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showAiModal && (
          <AiGenerationModal onClose={() => setShowAiModal(false)} onApply={handleAiApply} />
        )}
      </AnimatePresence>
    </div>
  );
}
