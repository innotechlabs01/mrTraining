'use client'

import { motion } from 'framer-motion'
import {
  AlertCircle, RefreshCw, Sun, CheckCircle, Users, Trophy, Flag, ArrowRight, Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAthletes } from '../../hooks/useAthletes'
import { useSessions } from '../../hooks/useSessions'
import { useCoachPanel } from '@/features/coach/components/layout/CoachPanelContext'

function Skeleton() {
  return (
    <motion.div
      className="glass-card rounded-lg p-5 space-y-3"
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="h-4 bg-surface-5 rounded w-2/3" />
      <div className="h-3 bg-surface-5 rounded w-1/2" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-16 bg-surface-5 rounded" />
        <div className="h-16 bg-surface-5 rounded" />
        <div className="h-16 bg-surface-5 rounded" />
      </div>
    </motion.div>
  )
}

export default function MidDayReview() {
  const { athletes, flaggedAthletes, isLoading: athletesLoading, error: athletesError } = useAthletes()
  const { sessions, isLoading: sessionsLoading, error: sessionsError } = useSessions()
  const { openPanel } = useCoachPanel()

  const isLoading = athletesLoading || sessionsLoading
  const error = athletesError || sessionsError

  const completedSessions = sessions.filter((s) => s.status === 'completed')
  const afternoonSessions = sessions.filter((s) => s.time.includes('PM') && s.status !== 'completed')
  const trainedAthleteIds = new Set(completedSessions.flatMap((s) => s.athleteIds))

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-7 bg-surface-5 rounded w-40" />
        <Skeleton />
        <Skeleton />
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
          Failed to load mid-day data. Please try again.
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

  if (completedSessions.length === 0 && afternoonSessions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-lg p-8 text-center"
      >
        <Sun className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Morning complete, no afternoon sessions</h3>
        <p className="text-sm text-secondary">
          Your morning is done and there's nothing scheduled for the afternoon. Enjoy the rest of your day!
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold font-display">Mid-day Review</h2>
        <p className="text-sm text-secondary">Morning recap and afternoon preparation</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-3"
      >
        <StatCard
          icon={CheckCircle}
          label="Sessions"
          value={`${completedSessions.length}/${sessions.length}`}
          color="text-success"
        />
        <StatCard
          icon={Users}
          label="Athletes Trained"
          value={trainedAthleteIds.size}
          color="text-brand-secondary"
        />
        <StatCard
          icon={Flag}
          label="Flags"
          value={flaggedAthletes.length}
          color={flaggedAthletes.length > 0 ? 'text-warning' : 'text-[#6B7280]'}
        />
      </motion.div>

      {completedSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">Completed Sessions</p>
          {completedSessions.map((s) => (
            <div key={s.id} className="glass-card rounded-lg p-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-success shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{s.name}</p>
                <p className="text-xs text-secondary">{s.location}</p>
              </div>
              <span className="text-xs text-[#6B7280]">{s.athleteIds.length} athletes</span>
            </div>
          ))}
        </motion.div>
      )}

      {afternoonSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">Afternoon Sessions</p>
          {afternoonSessions.map((s) => (
            <div key={s.id} className="glass-card rounded-lg p-3 flex items-center gap-3">
              <Calendar className="w-4 h-4 text-brand-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{s.name}</p>
                <p className="text-xs text-secondary">{s.time} · {s.location}</p>
              </div>
              <span className="text-xs text-[#6B7280]">{s.athleteIds.length} athletes</span>
            </div>
          ))}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={() => openPanel('session', { sessions: afternoonSessions })}
          className="w-full h-12 bg-brand-primary hover:bg-brand-primary-hover rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          Prepare Afternoon Sessions
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="glass-card rounded-lg p-4 flex flex-col items-center gap-1.5 text-center">
      <Icon className={cn('w-5 h-5', color)} />
      <span className="text-xl font-semibold font-display font-bold text-white">{value}</span>
      <span className="text-xs text-secondary">{label}</span>
    </div>
  )
}
