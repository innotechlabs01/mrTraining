'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AthleteBrief } from '../../types'

interface RpeCollectionModalProps {
  athletes: AthleteBrief[]
  onClose: () => void
  onSubmit: (ratings: Record<string, number>) => void
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function RpeCollectionModal({ athletes, onClose, onSubmit }: RpeCollectionModalProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const allRated = athletes.every((a) => ratings[a.id] !== undefined)

  const toggleRating = (athleteId: string, value: number) => {
    setRatings((prev) => {
      if (prev[athleteId] === value) {
        const next = { ...prev }
        delete next[athleteId]
        return next
      }
      return { ...prev, [athleteId]: value }
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg bg-surface-2 rounded-xl border border-white/10 max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-brand-primary" />
            <h3 className="text-lg font-semibold">Rate Today&apos;s Session</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface-5 text-secondary hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {athletes.map((athlete) => (
            <div key={athlete.id}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-surface-5 flex items-center justify-center text-xs font-semibold text-secondary">
                  {getInitials(athlete.name)}
                </div>
                <span className="text-sm font-medium text-white">{athlete.name}</span>
                {ratings[athlete.id] !== undefined && (
                  <span className="text-xs text-brand-primary ml-auto font-semibold">
                    RPE {ratings[athlete.id]}
                  </span>
                )}
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                  const selected = ratings[athlete.id] === val
                  return (
                    <button
                      key={val}
                      onClick={() => toggleRating(athlete.id, val)}
                      className={cn(
                        'flex-1 aspect-square rounded-md text-xs font-medium transition-all',
                        selected
                          ? 'bg-brand-primary text-white scale-105'
                          : 'bg-surface-5 text-secondary hover:bg-surface-6 hover:text-white',
                      )}
                    >
                      {val}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-white/5">
          <button
            disabled={!allRated}
            onClick={() => onSubmit(ratings)}
            className={cn(
              'w-full h-11 rounded-md font-semibold text-sm transition-colors',
              allRated
                ? 'bg-brand-primary hover:bg-brand-primary-hover text-white'
                : 'bg-surface-5 text-[#6B7280] cursor-not-allowed',
            )}
          >
            {allRated
              ? `Submit Ratings (avg ${(Object.values(ratings).reduce((a, b) => a + b, 0) / Object.values(ratings).length).toFixed(1)})`
              : `Rate all athletes (${Object.keys(ratings).length}/${athletes.length})`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
