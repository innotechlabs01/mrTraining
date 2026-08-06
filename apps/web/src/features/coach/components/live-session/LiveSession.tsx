'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle, RefreshCw, Clock, MapPin, Plus, StickyNote, LogOut, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AthleteBrief } from '../../types'
import { useSessions } from '../../hooks/useSessions'
import { useAthletes } from '../../hooks/useAthletes'
import { useToday } from '../../hooks/useToday'
import { useCoachPanel } from '@/features/coach/components/layout/CoachPanelContext'
import AthleteSessionCard from './AthleteSessionCard'
import RpeCollectionModal from './RpeCollectionModal'
import QuickNoteModal from './QuickNoteModal'

function Skeleton() {
  return (
    <motion.div
      className="glass-card rounded-lg p-4 space-y-3"
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-5 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-surface-5 rounded w-2/5" />
          <div className="h-2.5 bg-surface-5 rounded w-1/3" />
        </div>
        <div className="h-4 bg-surface-5 rounded w-12" />
      </div>
    </motion.div>
  )
}

export default function LiveSession() {
  const { sessions, isLoading: sessionsLoading, error: sessionsError } = useSessions()
  const { getAthleteById } = useAthletes()
  const { currentBlockId } = useToday()
  const [elapsed, setElapsed] = useState(0)
  const [showRpeModal, setShowRpeModal] = useState(false)
  const [showQuickNoteModal, setShowQuickNoteModal] = useState(false)

  const activeSessions = sessions.filter((s) => s.status === 'in-progress')
  const plannedBeforeLive = sessions.filter(
    (s) => s.status === 'planned' || s.status === 'ready',
  )

  const isLoading = sessionsLoading
  const error = sessionsError
  const isBeforeLiveSession = !['live-session', 'mid-day', 'daily-summary'].includes(currentBlockId as string)
  const noActiveSession = activeSessions.length === 0
  const hasData = !noActiveSession

  useEffect(() => {
    if (!hasData) return
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [hasData])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-7 bg-surface-5 rounded w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Skeleton />
          <Skeleton />
          <Skeleton />
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
          Failed to load live session data. Please try again.
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

  if (isBeforeLiveSession) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-lg p-8 text-center"
      >
        <Clock className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Active Sessions Yet</h3>
        <p className="text-sm text-secondary">
          Live sessions will appear here once they start. Currently in the preparation phase.
        </p>
        {plannedBeforeLive.length > 0 && (
          <p className="text-xs text-secondary mt-2">
            {plannedBeforeLive.length} session{plannedBeforeLive.length > 1 ? 's' : ''} scheduled for today
          </p>
        )}
      </motion.div>
    )
  }

  if (noActiveSession) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-lg p-8 text-center"
      >
        <Activity className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Sessions In Progress</h3>
        <p className="text-sm text-secondary">
          There are no live sessions at the moment. Start a session to see athletes here.
        </p>
      </motion.div>
    )
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleRpeSubmit = (ratings: Record<string, number>) => {
    setShowRpeModal(false)
  }

  return (
    <div className="space-y-4">
      {activeSessions.map((session) => {
        const athletes = session.athleteIds
          .map((id) => getAthleteById(id))
          .filter((a): a is NonNullable<typeof a> => a != null)

        return (
          <div key={session.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold font-display">{session.name}</h2>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-secondary flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(elapsed)}
                  </span>
                  <span className="text-xs text-secondary flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {session.location}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded text-xs uppercase tracking-wider bg-success/10 text-success">
                LIVE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {athletes.map((athlete, idx) => (
                <AthleteSessionCard
                  key={athlete!.id}
                  athlete={athlete!}
                  session={session}
                  currentExerciseIndex={Math.min(idx, session.exercises.length - 1)}
                  hr={athlete!.readiness ? undefined : undefined}
                  status={idx === 0 ? 'active' : idx === 1 ? 'resting' : 'complete'}
                />
              ))}
            </div>
          </div>
        )
      })}

      <div className="glass-card rounded-lg p-3 flex items-center justify-center gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-surface-5 hover:bg-surface-6 rounded-md text-sm text-secondary transition-colors">
          <Plus className="w-4 h-4" />
          Add Exercise
        </button>
        <button
          onClick={() => setShowQuickNoteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-surface-5 hover:bg-surface-6 rounded-md text-sm text-secondary transition-colors"
        >
          <StickyNote className="w-4 h-4" />
          Quick Note
        </button>
        <button
          onClick={() => setShowRpeModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-error/10 hover:bg-error/20 text-error rounded-md text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          End Session
        </button>
      </div>

      <AnimatePresence>
        {showRpeModal && (
          <RpeCollectionModal
            athletes={activeSessions.flatMap((s) =>
              s.athleteIds.map((id) => getAthleteById(id)).filter(Boolean) as AthleteBrief[],
            )}
            onClose={() => setShowRpeModal(false)}
            onSubmit={handleRpeSubmit}
          />
        )}

        {showQuickNoteModal && (
          <QuickNoteModal
            onClose={() => setShowQuickNoteModal(false)}
            onSave={(note, tags) => {
              setShowQuickNoteModal(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
