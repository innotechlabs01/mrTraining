'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Moon, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SleepLogEntry, SleepQuality } from '../types'

const qualityOptions: { value: SleepQuality; label: string; emoji: string }[] = [
  { value: 'great', label: 'Great', emoji: '🌟' },
  { value: 'good', label: 'Good', emoji: '😊' },
  { value: 'okay', label: 'Okay', emoji: '😐' },
  { value: 'poor', label: 'Poor', emoji: '😴' },
]

export default function SleepLogForm({
  onSubmit,
  onClose,
}: {
  onSubmit: (entry: SleepLogEntry) => void
  onClose: () => void
}) {
  const [bedtime, setBedtime] = useState('22:00')
  const [wakeTime, setWakeTime] = useState('06:00')
  const [quality, setQuality] = useState<SleepQuality>('good')
  const [notes, setNotes] = useState('')

  const calcHours = (): number => {
    const [bh, bm] = bedtime.split(':').map(Number)
    const [wh, wm] = wakeTime.split(':').map(Number)
    let hours = wh + wm / 60 - (bh + bm / 60)
    if (hours < 0) hours += 24
    return Math.round(hours * 10) / 10
  }

  const handleSubmit = () => {
    onSubmit({
      date: new Date().toISOString().split('T')[0],
      bedtime,
      wakeTime,
      hours: calcHours(),
      quality,
      notes: notes.trim() || undefined,
    })
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-surface-1 rounded-t-3xl p-6 border-t border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Log Sleep</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 font-medium mb-2 block">Bedtime</label>
              <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-3">
                <Clock className="w-4 h-4 text-white/30" />
                <input
                  type="time"
                  value={bedtime}
                  onChange={(e) => setBedtime(e.target.value)}
                  className="bg-transparent text-white text-sm font-medium focus:outline-none w-full"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 font-medium mb-2 block">Wake time</label>
              <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-3">
                <Clock className="w-4 h-4 text-white/30" />
                <input
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="bg-transparent text-white text-sm font-medium focus:outline-none w-full"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 font-medium mb-3 block">
              Duration: <span className="text-white font-semibold">{calcHours()} hours</span>
            </label>
          </div>

          <div>
            <label className="text-xs text-white/50 font-medium mb-3 block">Quality</label>
            <div className="flex gap-2">
              {qualityOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setQuality(opt.value)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border border-white/5 transition-all',
                    quality === opt.value
                      ? 'bg-indigo-500/10 border-indigo-500/30'
                      : 'bg-white/[0.03] hover:bg-white/[0.06]'
                  )}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <span className={cn(
                    'text-xs font-medium',
                    quality === opt.value ? 'text-indigo-400' : 'text-white/40'
                  )}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 font-medium mb-2 block">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did you sleep?"
              className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none resize-none h-20"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-400 active:scale-[0.97] transition-all shadow-lg shadow-indigo-500/25"
          >
            Save Sleep Log
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
