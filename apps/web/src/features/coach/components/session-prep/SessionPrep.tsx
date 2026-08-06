'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle, RefreshCw, Calendar, MapPin, Users, ChevronDown, ChevronRight,
  Sparkles, Check, X, Dumbbell, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSessions } from '../../hooks/useSessions'
import { useAthletes } from '../../hooks/useAthletes'
import { useCoachPanel } from '@/features/coach/components/layout/CoachPanelContext'
import type { CoachSession, AiSuggestion } from '../../types'

const statusConfig: Record<CoachSession['status'], { label: string; className: string }> = {
  planned: { label: 'Planned', className: 'bg-surface-5 text-secondary' },
  ready: { label: 'Ready', className: 'bg-brand-primary/10 text-brand-primary' },
  'in-progress': { label: 'In Progress', className: 'bg-success/10 text-success' },
  completed: { label: 'Completed', className: 'bg-surface-5 text-[#6B7280]' },
}

function Skeleton() {
  return (
    <motion.div
      className="glass-card rounded-lg p-5 space-y-3"
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-surface-5 rounded w-2/3" />
          <div className="h-3 bg-surface-5 rounded w-1/3" />
        </div>
        <div className="h-6 bg-surface-5 rounded w-16" />
      </div>
    </motion.div>
  )
}

export default function SessionPrep() {
  const { sessions, isLoading, error } = useSessions()
  const { getAthleteById } = useAthletes()
  const { openPanel } = useCoachPanel()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [adjustmentState, setAdjustmentState] = useState<Record<string, 'dismissed' | 'applied'>>({})

  const plannedSessions = sessions.filter((s) => s.status !== 'completed')

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDismiss = (adjId: string) => {
    setAdjustmentState((prev) => ({ ...prev, [adjId]: 'dismissed' }))
  }

  const handleApply = (adjId: string) => {
    setAdjustmentState((prev) => ({ ...prev, [adjId]: 'applied' }))
  }

  const getActiveAdjustments = (session: CoachSession) =>
    (session.aiAdjustments ?? []).filter(
      (adj) => adjustmentState[adj.id] === undefined,
    )

  const applyAll = (session: CoachSession) => {
    const active = getActiveAdjustments(session)
    active.forEach((adj) => handleApply(adj.id))
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-7 bg-surface-5 rounded w-48" />
        <div className="space-y-3">
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
          Failed to load sessions. Please try again.
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

  if (plannedSessions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-lg p-8 text-center"
      >
        <Calendar className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
        <h3 className="text-lg font-semibold font-display mb-2">No sessions planned</h3>
        <p className="text-sm text-secondary">
          Sessions will appear here once they&apos;re scheduled for today.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold font-display">Session Preparation</h2>
        <p className="text-sm text-secondary">Review and adjust today&apos;s sessions</p>
      </div>

      <div className="space-y-3">
        {plannedSessions.map((session, idx) => {
          const isExpanded = expandedIds.has(session.id)
          const activeAdjustments = getActiveAdjustments(session)
          const athletes = session.athleteIds
            .map((id) => getAthleteById(id))
            .filter((a): a is NonNullable<typeof a> => a != null)
          const status = statusConfig[session.status]

          return (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-card rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleExpanded(session.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-3/50 transition-colors"
              >
                <div className="shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-secondary" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-secondary" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">{session.name}</p>
                    <span className={cn('px-2 py-0.5 rounded text-[10px] uppercase tracking-wider shrink-0', status.className)}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-secondary flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {session.time} – {session.endTime}
                    </span>
                    <span className="text-xs text-secondary flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {session.location}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-xs text-secondary">
                  <Users className="w-3.5 h-3.5" />
                  {athletes.length}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-0 border-t border-white/5">
                      {athletes.length > 0 && (
                        <div className="mt-3 mb-3 flex flex-wrap gap-1.5">
                          {athletes.map((a) => (
                            <button
                              key={a!.id}
                              onClick={() => openPanel('athlete', { name: a!.name, sport: a!.sport, readiness: a!.readiness })}
                              className="text-xs text-secondary hover:text-white bg-surface-5 hover:bg-surface-6 px-2 py-0.5 rounded transition-colors"
                            >
                              {a!.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {session.exercises.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">Exercises</p>
                          {session.exercises.map((ex) => (
                            <div
                              key={ex.id}
                              className="flex items-center gap-2 text-xs text-secondary"
                            >
                              <Dumbbell className="w-3 h-3 text-[#6B7280] shrink-0" />
                              <span className="flex-1">{ex.name}</span>
                              <span className="tabular-nums">{ex.sets}×{ex.reps}</span>
                              {ex.weight && <span className="text-[#6B7280]">{ex.weight}kg</span>}
                              <span className="text-[#6B7280]">{ex.rest}s rest</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {session.aiAdjustments && session.aiAdjustments.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">AI Adjustments</p>
                            {activeAdjustments.length > 1 && (
                              <button
                                onClick={() => applyAll(session)}
                                className="text-xs text-brand-primary hover:text-brand-primary-hover font-medium transition-colors"
                              >
                                Apply All
                              </button>
                            )}
                          </div>
                          {session.aiAdjustments.map((adj) => {
                            const state = adjustmentState[adj.id]

                            if (state === 'dismissed') return null

                            return (
                              <AdjustmentCard
                                key={adj.id}
                                suggestion={adj}
                                state={state}
                                onDismiss={() => handleDismiss(adj.id)}
                                onApply={() => handleApply(adj.id)}
                              />
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function AdjustmentCard({
  suggestion,
  state,
  onDismiss,
  onApply,
}: {
  suggestion: AiSuggestion
  state?: string
  onDismiss: () => void
  onApply: () => void
}) {
  if (state === 'applied') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-success/5 border border-success/10">
        <Check className="w-3.5 h-3.5 text-success shrink-0" />
        <span className="text-xs text-success">{suggestion.title} — Applied</span>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-5 rounded-md p-3 space-y-2 border-l-2 border-brand-primary"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="inline-flex items-center gap-1 bg-brand-primary/10 text-brand-primary text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium shrink-0 mt-0.5">
            <Sparkles className="w-2.5 h-2.5" />
            AI
          </span>
          <div>
            <p className="text-xs font-medium text-white">{suggestion.title}</p>
            <p className="text-xs text-secondary mt-0.5">{suggestion.description}</p>
          </div>
        </div>
      </div>
      <p className="text-xs text-[#6B7280] italic">&quot;{suggestion.reasoning}&quot;</p>
      <div className="flex items-center gap-2">
        <button
          onClick={onApply}
          className="flex items-center gap-1 px-3 py-1.5 bg-brand-primary hover:bg-brand-primary-hover rounded text-xs font-medium transition-colors"
        >
          <Check className="w-3 h-3" />
          {suggestion.actionLabel}
        </button>
        <button
          onClick={onDismiss}
          className="flex items-center gap-1 px-3 py-1.5 bg-surface-4 hover:bg-surface-6 rounded text-xs text-secondary transition-colors"
        >
          <X className="w-3 h-3" />
          Dismiss
        </button>
      </div>
    </motion.div>
  )
}
