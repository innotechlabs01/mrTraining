'use client'

import { motion } from 'framer-motion'
import { Moon, Flame, CheckCircle, Target, Sparkles } from 'lucide-react'
import { useNightSummary } from '@/features/athlete/hooks/useExtra'
import { cn } from '@/lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

function SummarySkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 bg-white/5 rounded-xl w-1/3" />
      <div className="h-24 bg-white/5 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 bg-white/5 rounded-2xl" />
        <div className="h-24 bg-white/5 rounded-2xl" />
        <div className="h-24 bg-white/5 rounded-2xl" />
        <div className="h-24 bg-white/5 rounded-2xl" />
      </div>
      <div className="h-20 bg-white/5 rounded-2xl" />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  suffix,
  color,
  delay,
}: {
  icon: React.ReactNode; label: string; value: number | string; suffix?: string
  color: string; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className={cn('rounded-2xl p-4 border text-center', color)}
    >
      <div className="flex justify-center mb-2">{icon}</div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.15 }}
        className="text-xl font-bold text-white"
      >
        {value}
        {suffix && <span className="text-sm text-white/50 ml-0.5">{suffix}</span>}
      </motion.p>
      <p className="text-xs text-white/40 mt-0.5">{label}</p>
    </motion.div>
  )
}

function StreakBadge({ streak }: { streak: number }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20"
    >
      <Flame className="w-5 h-5 text-orange-400" />
      <span className="text-sm font-bold text-orange-400">{streak}-day streak</span>
    </motion.div>
  )
}

export default function NightSummary() {
  const { summary, loading, error } = useNightSummary()

  if (loading) return <SummarySkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Moon className="w-10 h-10 text-red-400/50 mb-4" />
        <p className="text-red-400 text-sm mb-2">{error}</p>
        <p className="text-white/40 text-xs">We&apos;ll try again in a moment</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <Sparkles className="w-10 h-10 text-orange-400/50 mb-4" />
        <p className="text-white font-semibold text-lg mb-1">Welcome to your journey</p>
        <p className="text-white/40 text-sm">Tomorrow is day one. Let&apos;s make it count.</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="text-center">
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 250, damping: 16 }}
          className="inline-flex mb-4"
        >
          <CheckCircle className="w-12 h-12 text-green-400" />
        </motion.div>
        <h1 className="text-2xl font-bold text-white">Day Complete</h1>
        <p className="text-sm text-white/40 mt-1">{summary.date}</p>
        <div className="mt-4 flex justify-center">
          <StreakBadge streak={summary.streak} />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<CheckCircle className="w-4 h-4 text-green-400" />}
          label="Workout"
          value={summary.workoutCompleted ? 'Done' : 'Pending'}
          color={summary.workoutCompleted ? 'bg-green-500/5 border-green-500/20' : 'bg-surface-1 border-white/5'}
          delay={0.3}
        />
        <StatCard
          icon={<Flame className="w-4 h-4 text-orange-400" />}
          label="Exercises"
          value={summary.exercisesCompleted}
          suffix={`/${summary.totalExercises}`}
          color="bg-surface-1 border-white/5"
          delay={0.4}
        />
        <StatCard
          icon={<span className="text-blue-400 text-sm">💧</span>}
          label="Hydration"
          value={summary.waterPercentage}
          suffix="%"
          color="bg-surface-1 border-white/5"
          delay={0.5}
        />
        <StatCard
          icon={<span className="text-orange-400 text-sm">🍎</span>}
          label="Meals"
          value={summary.mealsLogged}
          suffix={`/${summary.totalMeals}`}
          color="bg-surface-1 border-white/5"
          delay={0.6}
        />
      </motion.div>

      {summary.highlights.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-surface-1 rounded-2xl p-5 border border-white/5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-white/50 font-medium">Highlights</span>
          </div>
          <ul className="space-y-2">
            {summary.highlights.map((h, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className="flex items-start gap-2 text-sm text-white/60"
              >
                <span className="text-orange-400 mt-0.5 flex-shrink-0">•</span>
                {h}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      <motion.div
        variants={itemVariants}
        className="bg-surface-1 rounded-2xl p-5 border border-white/5"
      >
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-white/50 font-medium">Tomorrow</span>
        </div>
        <p className="text-sm text-white/70">{summary.tomorrowPreview}</p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="bg-orange-500/5 rounded-2xl p-5 border border-orange-500/15 text-center"
      >
        <p className="text-sm text-white/70 italic">&ldquo;{summary.motivationQuote}&rdquo;</p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="flex justify-center pt-2"
      >
        <a
          href="/athlete/today/morning"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-400 active:scale-[0.97] transition-all"
        >
          Tomorrow&apos;s Preview
          <span className="text-lg">→</span>
        </a>
      </motion.div>
    </motion.div>
  )
}
