'use client'

import { motion } from 'framer-motion'
import { Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AthleteBrief } from '../../types'

interface AthleteReadinessCardProps {
  athlete: AthleteBrief
  onClick: () => void
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-success'
  if (score >= 60) return 'text-warning'
  return 'text-error'
}

function getScoreBg(score: number) {
  if (score >= 80) return 'bg-success/10'
  if (score >= 60) return 'bg-warning/10'
  return 'bg-error/10'
}

export default function AthleteReadinessCard({ athlete, onClick }: AthleteReadinessCardProps) {
  const { name, sport, avatarUrl, readiness, flag } = athlete

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="glass-card rounded-lg p-4 cursor-pointer hover:bg-surface-3 transition-colors"
    >
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-surface-5 flex items-center justify-center text-sm font-semibold text-secondary shrink-0">
            {getInitials(name)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white truncate">{name}</p>
            {flag && (
              <span className="shrink-0" title={flag.message}>
                <Flag className={cn(
                  'w-3.5 h-3.5',
                  flag.severity === 'high' ? 'text-error' : flag.severity === 'medium' ? 'text-warning' : 'text-[#6B7280]'
                )} />
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B7280] truncate">{sport}</p>
        </div>

        <div className={cn(
          'w-12 h-12 rounded-lg flex items-center justify-center text-lg font-semibold font-bold shrink-0',
          getScoreBg(readiness.score),
          getScoreColor(readiness.score),
        )}>
          {readiness.score}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <MiniBar label="Sleep" value={readiness.sleep} max={10} unit="h" />
        <MiniBar label="HRV" value={readiness.hrv} max={100} unit="ms" />
        <MiniBar label="Recovery" value={readiness.recovery} max={100} unit="%" />
      </div>

      {flag && (
        <div className="mt-2 flex items-start gap-1.5">
          <Flag className={cn(
            'w-3 h-3 mt-0.5 shrink-0',
            flag.severity === 'high' ? 'text-error' : 'text-warning'
          )} />
          <p className={cn(
            'text-xs leading-tight',
            flag.severity === 'high' ? 'text-error' : 'text-warning'
          )}>
            {flag.message}
          </p>
        </div>
      )}
    </motion.div>
  )
}

function MiniBar({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  const pct = Math.min((value / max) * 100, 100)

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#6B7280] w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-surface-5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full',
            pct >= 80 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-error',
          )}
        />
      </div>
      <span className="text-xs text-secondary w-12 text-right tabular-nums shrink-0">
        {value}
        {unit}
      </span>
    </div>
  )
}
