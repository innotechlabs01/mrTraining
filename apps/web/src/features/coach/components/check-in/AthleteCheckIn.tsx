'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, RefreshCw, Users, Filter, FilterX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAthletes } from '../../hooks/useAthletes'
import { useCoachPanel } from '@/features/coach/components/layout/CoachPanelContext'
import AthleteReadinessCard from './AthleteReadinessCard'

function SkeletonRow() {
  return (
    <motion.div
      className="glass-card rounded-lg p-4 flex items-center gap-3"
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="w-10 h-10 rounded-full bg-surface-5 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-surface-5 rounded w-1/3" />
        <div className="h-2.5 bg-surface-5 rounded w-1/4" />
      </div>
      <div className="w-12 h-12 rounded-lg bg-surface-5" />
    </motion.div>
  )
}

export default function AthleteCheckIn() {
  const { athletes, isLoading, error } = useAthletes()
  const { openPanel } = useCoachPanel()
  const [flaggedOnly, setFlaggedOnly] = useState(false)

  const filteredAthletes = flaggedOnly
    ? athletes.filter((a) => a.flag !== undefined)
    : athletes

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 bg-surface-5 rounded w-40" />
          <div className="h-8 bg-surface-5 rounded w-28" />
        </div>
        <div className="space-y-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-lg p-6 text-center"
      >
        <AlertCircle className="w-10 h-10 text-error mx-auto mb-3" />
        <p className="text-sm text-secondary mb-4">
          Failed to load athletes. Please try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface-5 hover:bg-surface-6 rounded-md text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </motion.div>
    )
  }

  if (athletes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-lg p-8 text-center"
      >
        <Users className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
        <h3 className="text-lg font-semibold font-display mb-2">No athletes today</h3>
        <p className="text-sm text-secondary">
          Athletes will appear here once they're assigned to today's sessions.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold font-display">Morning Check-in</h2>
          <p className="text-sm text-secondary">Review athlete readiness before sessions</p>
        </div>
        <button
          onClick={() => setFlaggedOnly((prev) => !prev)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            flaggedOnly
              ? 'bg-warning/10 text-warning border border-warning/20'
              : 'bg-surface-5 text-secondary hover:bg-surface-6',
          )}
        >
          {flaggedOnly ? <FilterX className="w-3.5 h-3.5" /> : <Filter className="w-3.5 h-3.5" />}
          {flaggedOnly ? 'Show all' : 'Flagged only'}
        </button>
      </div>

      <AnimatePresence mode="popLayout">
        {filteredAthletes.length === 0 ? (
          <motion.div
            key="empty-filter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass-card rounded-lg p-6 text-center"
          >
            <p className="text-sm text-secondary">No flagged athletes</p>
          </motion.div>
        ) : (
          <motion.div layout className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredAthletes.map((athlete) => (
                <AthleteReadinessCard
                  key={athlete.id}
                  athlete={athlete}
                  onClick={() =>
                    openPanel('athlete', {
                      id: athlete.id,
                      name: athlete.name,
                      sport: athlete.sport,
                      readiness: athlete.readiness,
                    })
                  }
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
