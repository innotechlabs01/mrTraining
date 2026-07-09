'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Sparkles, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRecoveryData } from '../hooks/useRecoveryData'
import RecoveryScoreCard from './RecoveryScoreCard'
import SleepCard from './SleepCard'
import HRVCard from './HRVCard'
import StressCard from './StressCard'
import HydrationCard from './HydrationCard'
import AIRecommendationCard from './AIRecommendationCard'
import SleepLogForm from './SleepLogForm'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 bg-white/5 rounded-xl w-1/3" />
      <div className="h-6 bg-white/5 rounded-lg w-1/2" />
      <div className="h-56 bg-white/5 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-32 bg-white/5 rounded-2xl" />
        <div className="h-32 bg-white/5 rounded-2xl" />
        <div className="h-32 bg-white/5 rounded-2xl" />
        <div className="h-32 bg-white/5 rounded-2xl" />
      </div>
      <div className="h-24 bg-white/5 rounded-2xl" />
    </div>
  )
}

export default function RecoveryDashboard() {
  const {
    data,
    loading,
    error,
    allStretchesDone,
    visibleRecommendations,
    toggleStretch,
    addWater,
    dismissRecommendation,
    logSleep,
    logSubjectiveScore,
  } = useRecoveryData()

  const [showSleepLog, setShowSleepLog] = useState(false)
  const [showFeelingForm, setShowFeelingForm] = useState(false)
  const [feelingScore, setFeelingScore] = useState(7)

  if (loading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Heart className="w-10 h-10 text-red-400/50 mb-4" />
        <p className="text-red-400 text-sm mb-2">{error}</p>
        <p className="text-white/40 text-xs">We&apos;ll try again in a moment</p>
      </div>
    )
  }

  if (!data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <Heart className="w-10 h-10 text-green-400/50 mb-4" />
        <p className="text-white font-semibold text-lg mb-1">No recovery data yet</p>
        <p className="text-white/40 text-sm">Start logging to see your recovery trends</p>
      </motion.div>
    )
  }

  const { recoveryScore, sleep, hrv, stress, hydration, stretches, aiRecommendations } = data

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-xl font-bold text-white">Recovery</h1>
        <p className="text-sm text-white/40 mt-1">Track your readiness & recovery metrics</p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
        <RecoveryScoreCard score={recoveryScore} />
        <div className="space-y-3">
          <SleepCard data={sleep} onLog={() => setShowSleepLog(true)} />
          <HRVCard data={hrv} />
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div variants={itemVariants} className="contents">
          <StressCard data={stress} />
        </motion.div>
        <motion.div variants={itemVariants} className="contents">
          <HydrationCard data={hydration} onAdd={addWater} />
        </motion.div>
      </div>

      {stretches.length > 0 && (
        <motion.div
          variants={itemVariants}
          className={cn(
            'rounded-2xl p-5 border',
            allStretchesDone ? 'bg-success/5 border-success/20' : 'bg-surface-1 border-white/5'
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-white/50 font-medium">Stretches & Mobility</span>
            {allStretchesDone && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 text-xs text-success font-medium"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                All done!
              </motion.span>
            )}
          </div>

          <div className="space-y-2">
            {stretches.map((stretch) => (
              <motion.button
                key={stretch.id}
                variants={itemVariants}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleStretch(stretch.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left',
                  stretch.completed
                    ? 'bg-success/5 border border-success/15'
                    : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]'
                )}
              >
                <CheckCircle
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    stretch.completed ? 'text-success' : 'text-white/15'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm transition-colors',
                    stretch.completed ? 'text-white/40 line-through' : 'text-white'
                  )}>
                    {stretch.name}
                  </p>
                </div>
                <span className={cn(
                  'text-xs shrink-0 transition-colors',
                  stretch.completed ? 'text-white/20' : 'text-white/30'
                )}>
                  {stretch.duration}s
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span className="text-xs text-white/50 font-medium">AI Recommendations</span>
        </div>
        <AnimatePresence>
          {visibleRecommendations.length > 0 ? (
            <div className="space-y-2">
              {visibleRecommendations.map((rec, i) => (
                <AIRecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onDismiss={dismissRecommendation}
                  index={i}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 rounded-xl bg-surface-1 border border-white/5"
            >
              <Sparkles className="w-8 h-8 text-orange-400/30 mb-2" />
              <p className="text-sm text-white/40">All recommendations addressed</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {allStretchesDone && (
        <motion.div
          variants={itemVariants}
          className="flex justify-center pt-2"
        >
          <a
            href="/athlete/today/nutrition"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-400 active:scale-[0.97] transition-all"
          >
            Next: Nutrition
            <span className="text-lg">→</span>
          </a>
        </motion.div>
      )}

      <AnimatePresence>
        {showSleepLog && (
          <SleepLogForm
            onSubmit={(entry) => {
              logSleep(entry)
              setShowSleepLog(false)
            }}
            onClose={() => setShowSleepLog(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
