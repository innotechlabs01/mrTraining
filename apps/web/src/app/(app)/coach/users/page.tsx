'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Flag } from 'lucide-react'
import { useAthletes } from '@/features/coach/hooks/useAthletes'
import { useCoachPanel } from '@/features/coach/components/layout/CoachPanelContext'
import { MOCK_ATHLETE_DETAILS } from '@/features/coach/data/_mocks'
import { cn } from '@/lib/utils'

export default function CoachUsersPage() {
  const { athletes } = useAthletes()
  const { openPanel } = useCoachPanel()
  const [search, setSearch] = useState('')
  const [filterFlagged, setFilterFlagged] = useState(false)

  const filtered = athletes.filter((a) => {
    const matchName = a.name.toLowerCase().includes(search.toLowerCase())
    const matchSport = a.sport.toLowerCase().includes(search.toLowerCase())
    if (filterFlagged) return (matchName || matchSport) && a.flag
    return matchName || matchSport
  })

  const handleCardClick = (athleteId: string) => {
    const detail = MOCK_ATHLETE_DETAILS[athleteId]
    if (detail) openPanel('athlete', detail as unknown as Record<string, unknown>)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Usuarios</h1>
          <p className="text-sm text-white/40 mt-1">{athletes.length} atletas activos</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilterFlagged(!filterFlagged)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              filterFlagged
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                : 'border-white/10 text-white/40 hover:border-white/20',
            )}
          >
            <Flag size={14} className="inline mr-1.5" />
            Con flags
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Buscar atleta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-1 border border-white/5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-primary/50"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((athlete, i) => (
          <motion.button
            key={athlete.id}
            onClick={() => handleCardClick(athlete.id)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="w-full text-left rounded-2xl border border-white/5 bg-surface-1 p-4 hover:border-brand-primary/30 hover:bg-surface-2 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary/30 to-brand-primary/10 flex items-center justify-center text-sm font-bold text-brand-primary">
                  {athlete.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{athlete.name}</p>
                  <p className="text-xs text-white/40">{athlete.sport}</p>
                </div>
              </div>
              <div className={cn(
                'px-2 py-0.5 rounded-md text-[10px] font-semibold',
                athlete.readiness.score >= 80 ? 'bg-green-500/10 text-green-400' :
                athlete.readiness.score >= 60 ? 'bg-amber-500/10 text-amber-400' :
                'bg-red-500/10 text-red-400',
              )}>
                {athlete.readiness.score}%
              </div>
            </div>
            {athlete.flag && (
              <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <Flag size={12} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-400/80">{athlete.flag.message}</p>
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
