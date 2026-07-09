'use client'

import { motion } from 'framer-motion'
import {
  BarChart3,
  Dumbbell,
  Weight,
  Activity,
  Flame,
  Trophy,
  Star,
  AlertCircle,
} from 'lucide-react'
import { useWorkoutRecords } from '@/features/athlete/hooks/useWorkoutRecords'
import { formatDate } from '@/features/workout'
import { cn } from '@/lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 bg-white/5 rounded-xl w-1/3" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-white/5 rounded-2xl" />
        ))}
      </div>
      <div className="h-52 bg-white/5 rounded-2xl" />
      <div className="h-32 bg-white/5 rounded-2xl" />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color = 'text-white',
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  color?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18, delay }}
      className="bg-surface-1 rounded-2xl p-5 border border-white/5 flex flex-col items-center justify-center"
    >
      <Icon className="w-5 h-5 text-white/30 mb-2" />
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      <p className="text-xs text-white/40 mt-0.5">{label}</p>
    </motion.div>
  )
}

function CircularProgress({ percentage, size = 100 }: { percentage: number; size?: number }) {
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#FF6B00"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <span className="absolute text-2xl font-bold text-white">{percentage}%</span>
    </div>
  )
}

export default function WorkoutAnalytics() {
  const { stats, records, loading, error } = useWorkoutRecords()

  if (loading) return <AnalyticsSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-400/50 mb-4" />
        <p className="text-red-400 text-sm mb-2">{error}</p>
        <p className="text-white/40 text-xs">We&apos;ll try again in a moment</p>
      </div>
    )
  }

  if (!stats || records.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <BarChart3 className="w-10 h-10 text-white/20 mb-4" />
        <p className="text-white font-semibold text-lg mb-1">Start training to see your analytics</p>
        <p className="text-white/40 text-sm leading-relaxed">
          Your stats, PRs, and trends will appear as you complete workouts
        </p>
      </motion.div>
    )
  }

  const maxVolume = Math.max(...stats.weeklyVolume.map((w) => w.volume), 1)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      <motion.h1
        variants={itemVariants}
        className="text-xl font-bold text-white"
      >
        Analytics
      </motion.h1>

      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Dumbbell}
          label="Total Sessions"
          value={String(stats.totalSessions)}
          delay={0}
        />
        <StatCard
          icon={Weight}
          label="Total Volume"
          value={`${(stats.totalVolume / 1000).toFixed(1)}k kg`}
          delay={0.05}
        />
        <StatCard
          icon={Activity}
          label="Avg RPE"
          value={String(stats.averageRpe)}
          delay={0.1}
        />
        <StatCard
          icon={Flame}
          label="Day Streak"
          value={String(stats.streak)}
          delay={0.15}
          color="text-orange-400"
        />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="bg-surface-1 rounded-2xl p-5 border border-white/5"
      >
        <h2 className="text-sm font-bold text-white mb-4">Weekly Volume</h2>
        <div className="flex items-end gap-3 h-40">
          {stats.weeklyVolume.map((week, i) => {
            const heightPct = (week.volume / maxVolume) * 100
            return (
              <div key={week.week} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 + i * 0.08 }}
                  className="w-full rounded-t-lg"
                  style={{
                    background: 'linear-gradient(180deg, #FF6B00 0%, rgba(255,107,0,0.4) 100%)',
                    minHeight: heightPct > 0 ? undefined : 0,
                  }}
                />
                <span className="text-[10px] text-white/30">{week.week}</span>
              </div>
            )
          })}
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="bg-surface-1 rounded-2xl p-5 border border-white/5"
      >
        <h2 className="text-sm font-bold text-white mb-4">Personal Records</h2>
        {stats.recentPrs.length === 0 ? (
          <p className="text-sm text-white/40">No PRs yet. Keep training!</p>
        ) : (
          <div className="space-y-3">
            {stats.recentPrs.map((pr, i) => (
              <motion.div
                key={`${pr.exercise}-${pr.date}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3"
              >
                <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{pr.exercise}</p>
                  <p className="text-xs text-white/30">{pr.date}</p>
                </div>
                <span className="text-sm font-semibold text-green-400">{pr.value}</span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="bg-surface-1 rounded-2xl p-5 border border-white/5 flex flex-col items-center"
      >
        <h2 className="text-sm font-bold text-white mb-5">Consistency</h2>
        <CircularProgress percentage={stats.consistency} />
        <p className="text-xs text-white/40 mt-4 text-center">
          {Math.round(stats.consistency / 100 * 28)} of last 28 days trained
        </p>
      </motion.div>
    </motion.div>
  )
}
