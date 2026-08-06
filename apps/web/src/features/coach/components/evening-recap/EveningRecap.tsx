'use client';

import { motion } from 'framer-motion';
import {
  Moon,
  CheckCircle2,
  Trophy,
  StickyNote,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessions } from '../../hooks/useSessions'
import { useDailySummary } from '../../hooks/useDailySummary'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function EveningRecap() {
  const { sessions } = useSessions()
  const { summary, isLoading } = useDailySummary()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
      </div>
    )
  }

  if (!summary) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/15">
            <Moon className="h-5 w-5 text-brand-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold font-display text-white">Evening Recap</h2>
            <p className="text-sm text-[#6B7280]">No hay resumen del dia aun.</p>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  const completedSessions = sessions.filter((s) => s.status === 'completed');

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/15">
          <Moon className="h-5 w-5 text-brand-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold font-display text-white">Evening Recap</h2>
          <p className="text-sm text-[#6B7280]">
            Cierre del día · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
        <div className="glass-card flex items-center gap-3 rounded-xl p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/15">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{completedSessions.length}</p>
            <p className="text-xs text-[#6B7280]">Sesiones completadas</p>
          </div>
        </div>
        <div className="glass-card flex items-center gap-3 rounded-xl p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-accent/15">
            <StickyNote className="h-5 w-5 text-violet-accent" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{summary.notesCount}</p>
            <p className="text-xs text-[#6B7280]">Notas registradas</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" />
          <h3 className="text-base font-semibold text-white">Lo mejor del día</h3>
        </div>
        <div className="space-y-2">
          {summary.highlights.map((highlight, i) => (
            <div
              key={`hl-${i}`}
              className="glass-card flex items-start gap-3 rounded-lg px-4 py-3"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-primary/15 text-xs font-bold text-brand-primary">
                {i + 1}
              </span>
              <p className="text-sm text-secondary">{highlight}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="glass-card rounded-xl p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-primary" />
            <h3 className="text-base font-semibold text-white">Recomendación IA</h3>
          </div>
          <p className="text-sm text-secondary">{summary.aiRecommendation}</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex gap-3">
        <button
          type="button"
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg bg-surface-2 px-5 py-3 text-sm font-medium text-secondary',
            'transition-all duration-200 hover:bg-surface-3 hover:text-white',
          )}
        >
          Ver resumen completo
          <ArrowRight className="h-4 w-4" />
        </button>
      </motion.div>
    </motion.div>
  );
}
