'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Users,
  CalendarCheck,
  MessageSquare,
  StickyNote,
  Sparkles,
  Sun,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DailySummary } from '../../types';

const MOCK_SUMMARY: DailySummary = {
  date: new Date().toISOString().split('T')[0],
  athleteCount: 8,
  sessionCount: 3,
  completedSessions: 2,
  completedSessionNames: ['Morning Speed Work', 'Strength & Conditioning'],
  messageCount: 4,
  notesCount: 3,
  highlights: [
    'Sarah Johnson set a new 100m personal best during warmup drills',
    'James Thompson showed improved block technique — start phase faster by 0.12s',
    'Aisha Patel completing first week of marathon base building — great consistency',
  ],
  aiRecommendation:
    'Consider reducing David Park\'s load tomorrow and scheduling a recovery session for Lucas Weber. Overall team readiness is trending positively.',
  tomorrowPreview: {
    athleteCount: 6,
    sessionCount: 2,
    suggestedFocus: 'Recovery and technique — lighter load after today\'s intensity',
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function DailySummary() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCheckmark, setShowCheckmark] = useState(false);

  const summary = useMemo(() => MOCK_SUMMARY, []);

  useEffect(() => {
    const loadTimer = setTimeout(() => setLoading(false), 500);
    const checkTimer = setTimeout(() => setShowCheckmark(true), 200);
    return () => {
      clearTimeout(loadTimer);
      clearTimeout(checkTimer);
    };
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-surface-1 p-12">
        <AlertCircle className="h-8 w-8 text-error" />
        <p className="text-sm text-secondary">Failed to load summary</p>
        <button
          type="button"
          onClick={handleRetry}
          className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="mx-auto h-24 w-24 animate-pulse rounded-full bg-surface-3" />
        <div className="mx-auto h-6 w-40 animate-pulse rounded bg-surface-3" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
        <div className="h-32 animate-pulse rounded-xl bg-surface-2" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="flex flex-col items-center gap-4 pt-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: showCheckmark ? 1 : 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 15,
            delay: 0.1,
          }}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-primary/15"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: showCheckmark ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
          >
            <CheckCircle2 className="h-12 w-12 text-brand-primary" />
          </motion.div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="text-center"
        >
          <h2 className="text-xl font-semibold font-display text-white">Today&apos;s Summary</h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </motion.div>
      </div>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 gap-3"
      >
        <div className="glass-card flex items-center gap-3 rounded-xl p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/15">
            <Users className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{summary.athleteCount}</p>
            <p className="text-xs text-[#6B7280]">Athletes trained</p>
          </div>
        </div>
        <div className="glass-card flex items-center gap-3 rounded-xl p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/15">
            <CalendarCheck className="h-5 w-5 text-brand-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{summary.completedSessions}</p>
            <p className="text-xs text-[#6B7280]">Sessions completed</p>
          </div>
        </div>
        <div className="glass-card flex items-center gap-3 rounded-xl p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-secondary/15">
            <MessageSquare className="h-5 w-5 text-brand-secondary" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{summary.messageCount}</p>
            <p className="text-xs text-[#6B7280]">Messages sent</p>
          </div>
        </div>
        <div className="glass-card flex items-center gap-3 rounded-xl p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-accent/15">
            <StickyNote className="h-5 w-5 text-violet-accent" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{summary.notesCount}</p>
            <p className="text-xs text-[#6B7280]">Notes logged</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" />
          <h3 className="text-base font-semibold text-white">Today&apos;s Highlights</h3>
        </div>
        <div className="space-y-2">
          {summary.highlights.length === 0 && (
            <p className="py-4 text-center text-sm text-[#6B7280]">No highlights recorded today</p>
          )}
          {summary.highlights.map((highlight, i) => (
            <motion.div
              key={`hl-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: 0.4 + i * 0.1, ease: 'easeOut' }}
              className="glass-card flex items-start gap-3 rounded-lg px-4 py-3"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-primary/15 text-xs font-bold text-brand-primary">
                {i + 1}
              </span>
              <p className="text-sm text-secondary">{highlight}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="glass-card rounded-xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sun className="h-4 w-4 text-warning" />
            <h3 className="text-base font-semibold text-white">Tomorrow&apos;s Preview</h3>
          </div>
          <div className="mb-3 flex gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#6B7280]" />
              <span className="text-sm text-secondary">
                {summary.tomorrowPreview.athleteCount} athletes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-[#6B7280]" />
              <span className="text-sm text-secondary">
                {summary.tomorrowPreview.sessionCount} sessions
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
            <p className="text-sm text-secondary">
              Suggested focus: <span className="text-white">{summary.tomorrowPreview.suggestedFocus}</span>
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="flex gap-3"
      >
        <button
          type="button"
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg bg-surface-2 px-5 py-3 text-sm font-medium text-secondary',
            'transition-all duration-200 hover:bg-surface-3 hover:text-white',
          )}
        >
          Preview Tomorrow
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-primary px-5 py-3 text-sm font-semibold text-white',
            'transition-all duration-200 hover:bg-brand-primary-hover',
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          End Day
        </button>
      </motion.div>
    </motion.div>
  );
}
