'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, animate } from 'framer-motion'
import { Sunrise, Users, Activity, Flag, Sparkles, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAthletes } from '../../hooks/useAthletes'
import { useSessions } from '../../hooks/useSessions'
import { useCoachPanel } from '@/features/coach/components/layout/CoachPanelContext'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function useCountUp(end: number, duration = 1.5) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const controls = animate(0, end, {
      duration,
      onUpdate: (latest) => setCount(Math.round(latest)),
    })
    return () => controls.stop()
  }, [end, duration])

  return count
}

function Skeleton() {
  return (
    <motion.div
      className="glass-card rounded-lg p-5 space-y-3"
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="h-4 bg-surface-5 rounded w-3/4" />
      <div className="h-3 bg-surface-5 rounded w-1/2" />
      <div className="h-3 bg-surface-5 rounded w-2/3" />
    </motion.div>
  )
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export default function MorningBrief() {
  const { athletes, flaggedAthletes, isLoading: athletesLoading, error: athletesError } = useAthletes()
  const { sessions, isLoading: sessionsLoading, error: sessionsError } = useSessions()
  const { openPanel } = useCoachPanel()

  const isLoading = athletesLoading || sessionsLoading
  const error = athletesError || sessionsError

  const todaySessions = sessions.filter((s) => s.status !== 'completed')
  const greeting = getGreeting()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton />
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
          Failed to load your briefing. Please try again.
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
        <Sunrise className="w-12 h-12 text-brand-primary mx-auto mb-4" />
        <h2 className="text-xl font-semibold font-display mb-2">Welcome to your first day!</h2>
        <p className="text-sm text-secondary mb-6">
          Your coaching dashboard is ready. Add athletes to get started.
        </p>
        <button
          onClick={() => openPanel('athlete', { action: 'add' })}
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-primary-hover rounded-md font-medium transition-colors"
        >
          <Users className="w-4 h-4" />
          Add Your First Athlete
        </button>
      </motion.div>
    )
  }

  const flaggedCount = flaggedAthletes.length
  const sessionCount = todaySessions.length

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold font-display">{greeting}, Coach</h1>
        <p className="text-sm text-secondary">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden glass-card rounded-lg p-5 border-l-4 border-brand-primary"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 bg-brand-primary/10 text-brand-primary text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium">
            <Sparkles className="w-3 h-3" />
            AI Brief
          </span>
        </div>
        <p className="text-sm text-secondary leading-relaxed">
          You have <span className="text-white font-semibold">{athletes.length} athletes</span> across{' '}
          <span className="text-white font-semibold">{sessionCount} sessions</span> today.
          {flaggedCount > 0 && (
            <>
              {' '}
              <span className="text-warning font-semibold">{flaggedCount} flag{flaggedCount > 1 ? 's' : ''}</span>{' '}
              need your attention before sessions begin.
            </>
          )}
          {!flaggedCount && ' Everyone is ready to go.'}
        </p>
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, label: 'Athletes', value: athletes.length, color: 'text-brand-primary' },
          { icon: Activity, label: 'Sessions', value: sessionCount, color: 'text-brand-secondary' },
          { icon: Flag, label: 'Flags', value: flaggedCount, color: flaggedCount > 0 ? 'text-warning' : 'text-secondary' },
        ].map((metric) => (
          <div
            key={metric.label}
            className="glass-card rounded-lg p-4 flex flex-col items-center gap-1.5"
          >
            <metric.icon className={cn('w-5 h-5', metric.color)} />
            <span className="text-xl font-semibold font-display font-bold text-white">
              <CountUpValue value={metric.value} />
            </span>
            <span className="text-xs text-secondary">{metric.label}</span>
          </div>
        ))}
      </motion.div>

      <motion.div variants={itemVariants}>
        <button
          onClick={() => openPanel('timeblock', { blockId: 'check-in' })}
          className="w-full h-12 bg-brand-primary hover:bg-brand-primary-hover rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          Start Today&apos;s Review
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </motion.div>
  )
}

function CountUpValue({ value }: { value: number }) {
  const count = useCountUp(value)
  return <>{count}</>
}
