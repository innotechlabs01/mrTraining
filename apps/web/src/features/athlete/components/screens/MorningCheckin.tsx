'use client'

import { motion } from 'framer-motion'
import { useMorning } from '@/features/athlete/hooks/useToday'
import { ATHLETE_NAME } from '@/features/athlete/data/_mocks'
import { cn } from '@/lib/utils'

const sleepEmoji = { great: '🌟', good: '😊', okay: '😐', poor: '😴' }

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

function MorningSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-10 bg-white/5 rounded-xl w-2/3" />
      <div className="h-6 bg-white/5 rounded-lg w-1/3" />
      <div className="h-28 bg-white/5 rounded-2xl" />
      <div className="h-36 bg-white/5 rounded-2xl" />
      <div className="h-12 bg-white/5 rounded-xl w-1/2 mx-auto" />
    </div>
  )
}

export default function MorningCheckin() {
  const { data, loading, error } = useMorning()

  if (loading) return <MorningSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-4xl mb-4">🌅</span>
        <p className="text-red-400 text-sm mb-3">{error}</p>
        <p className="text-white/40 text-xs">We&apos;ll try again in a moment</p>
      </div>
    )
  }

  if (!data?.todayWorkout) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <motion.span variants={itemVariants} className="text-5xl mb-5">☀️</motion.span>
        <motion.h1 variants={itemVariants} className="text-2xl font-bold text-white mb-2">
          Rest day, {ATHLETE_NAME}
        </motion.h1>
        <motion.p variants={itemVariants} className="text-white/50 text-sm max-w-xs">
          Recovery is training too. Take the time you need.
        </motion.p>
      </motion.div>
    )
  }

  const { todayWorkout: w, sleepHours, sleepQuality, quote } = data

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-white">
          Good morning, {ATHLETE_NAME}
        </h1>
        <p className="text-white/40 text-sm mt-1 italic">&ldquo;{quote}&rdquo;</p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className={cn(
          'rounded-2xl p-5 border',
          sleepQuality === 'great' || sleepQuality === 'good'
            ? 'bg-green-500/5 border-green-500/20'
            : 'bg-surface-1 border-white/5'
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-white/50 font-medium">Sleep</span>
          <span className="text-2xl">{sleepEmoji[sleepQuality]}</span>
        </div>
        <p className="text-lg font-semibold text-white">
          {sleepHours} hours
        </p>
        <p className="text-xs text-white/40 mt-0.5 capitalize">
          {sleepQuality} quality
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-surface-1 rounded-2xl p-5 border border-white/5">
        <span className="text-xs text-white/50 font-medium mb-3 block">Today&apos;s Workout</span>
        <h2 className="text-lg font-bold text-white">{w.name}</h2>
        <p className="text-sm text-orange-400 font-medium mt-1">{w.focus}</p>
        <p className="text-xs text-white/40 mt-2">
          {w.exercises.length} exercises &middot; ~{w.estimatedDuration} min
        </p>
        {w.coachNote && (
          <p className="text-xs text-white/50 mt-3 pt-3 border-t border-white/5 leading-relaxed">
            {w.coachNote}
          </p>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="flex justify-center pt-2">
        <a
          href="/athlete/today/workout"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-400 active:scale-[0.97] transition-all"
        >
          Let&apos;s Go
          <span className="text-lg">→</span>
        </a>
      </motion.div>
    </motion.div>
  )
}
