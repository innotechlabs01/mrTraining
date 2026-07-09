'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { WorkoutAnalytics, PersonalRecord } from '../types'
import { MOCK_ANALYTICS } from '../data/_mocks'
import { cn } from '@/lib/utils'
import {
  TrendingUp, TrendingDown, Flame, Target, Calendar, Clock,
  Trophy, Award, ChevronRight, Activity,
} from 'lucide-react'

interface WorkoutAnalyticsProps {
  analytics?: WorkoutAnalytics
  className?: string
}

type TimeRange = 'week' | 'month' | 'year'

export function WorkoutAnalytics({
  analytics = MOCK_ANALYTICS,
  className,
}: WorkoutAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('week')

  const { overview, volume, performance, consistency, recentPrs } = analytics

  const formatNumber = (num: number) => (num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num.toString())

  return (
    <div className={cn('space-y-6', className)}>
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Workout Analytics</h2>
        <div className="flex gap-1 p-1 rounded-lg bg-surface-3">
          {(['week', 'month', 'year'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize',
                timeRange === range
                  ? 'bg-orange-500 text-white'
                  : 'text-white/70 hover:text-white',
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Workouts" value={overview.totalWorkouts.toString()} subtitle={`${overview.completedWorkouts} completed`} icon={<Activity className="w-5 h-5" />} trend={{ value: 12, direction: 'up' }} />
        <MetricCard title="Total Volume" value={formatNumber(overview.totalVolume)} subtitle="kg lifted" icon={<Flame className="w-5 h-5" />} trend={{ value: 8, direction: 'up' }} />
        <MetricCard title="Avg Duration" value={`${overview.averageDuration}m`} subtitle="per session" icon={<Clock className="w-5 h-5" />} />
        <MetricCard title="Completion Rate" value={`${overview.completionRate}%`} subtitle="workouts completed" icon={<Target className="w-5 h-5" />} trend={{ value: 3, direction: 'up' }} />
      </div>

      {/* Streak & Consistency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-xl bg-gradient-to-br from-orange-500/20 to-transparent border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-6 h-6 text-orange-500" />
              <h3 className="font-semibold text-white">Training Streak</h3>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-orange-500">{consistency.currentStreak}</span>
            <span className="text-lg text-white/70">days</span>
          </div>
          <p className="text-sm text-white/40 mt-2">Best streak: {consistency.longestStreak} days</p>
        </div>

        <div className="p-6 rounded-xl bg-surface-3 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-6 h-6 text-brand-secondary" />
              <h3 className="font-semibold text-white">Training Frequency</h3>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">{consistency.weeklyFrequency.toFixed(1)}</span>
            <span className="text-lg text-white/70">sessions/week</span>
          </div>
          <p className="text-sm text-white/40 mt-2">Monthly average: {consistency.monthlyFrequency} sessions</p>
        </div>
      </div>

      {/* Volume Chart */}
      <div className="p-6 rounded-xl bg-surface-3 border border-white/5">
        <h3 className="font-semibold text-white mb-4">Weekly Volume</h3>
        <div className="h-48 flex items-end gap-2">
          {volume.weeklyVolume.map((vol, idx) => {
            const maxVol = Math.max(...volume.weeklyVolume)
            const height = (vol / maxVol) * 100
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: idx * 0.1, duration: 0.3 }}
                  className="w-full rounded-t-md bg-gradient-to-t from-orange-500 to-orange-400/60"
                />
                <span className="text-xs text-white/40">{formatNumber(vol)}</span>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-white/40">
          <span>Week 1</span>
          <span>Week 5</span>
        </div>
      </div>

      {/* RPE by Day */}
      <div className="p-6 rounded-xl bg-surface-3 border border-white/5">
        <h3 className="font-semibold text-white mb-4">Average RPE by Day</h3>
        <div className="flex items-end gap-3 h-32">
          {performance.rpeByDay.map((day, idx) => {
            const height = day.rpe ? (day.rpe / 10) * 100 : 0
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                  className={cn(
                    'w-full rounded-t-md',
                    day.rpe >= 8 ? 'bg-red-500' : day.rpe >= 7 ? 'bg-amber-500' : day.rpe > 0 ? 'bg-green-500' : 'bg-surface-6',
                  )}
                />
                <span className="text-xs text-white/40">{day.day}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Personal Records */}
      <div className="p-6 rounded-xl bg-surface-3 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            <h3 className="font-semibold text-white">Personal Records</h3>
          </div>
          <button className="text-sm text-brand-secondary hover:underline flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {recentPrs.slice(0, 5).map((pr) => (
            <PRCard key={pr.id} pr={pr} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  title, value, subtitle, icon, trend,
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  trend?: { value: number; direction: 'up' | 'down' }
}) {
  return (
    <div className="p-4 rounded-xl bg-surface-3 border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-white/40">{title}</span>
        <div className="text-white/40">{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend && (
          <div className={cn('flex items-center gap-0.5 text-xs font-medium', trend.direction === 'up' ? 'text-green-500' : 'text-red-500')}>
            {trend.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value}%
          </div>
        )}
      </div>
      <p className="text-xs text-white/40 mt-1">{subtitle}</p>
    </div>
  )
}

function PRCard({ pr }: { pr: PersonalRecord }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-surface-4">
      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
        <Award className="w-5 h-5 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{pr.exerciseName}</p>
        <p className="text-sm text-white/40">
          {new Date(pr.achievedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      </div>
      <div className="text-right">
        <p className="font-bold text-orange-500">{pr.value} {pr.unit}</p>
        <p className="text-xs text-green-500">+{pr.improvement.toFixed(1)}%</p>
      </div>
    </div>
  )
}
