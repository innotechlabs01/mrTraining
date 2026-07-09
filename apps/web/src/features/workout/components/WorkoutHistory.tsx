'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { WorkoutHistoryEntry, WorkoutFilterOptions } from '../types'
import { MOCK_HISTORY } from '../data/_mocks'
import { WorkoutHistoryCard } from './WorkoutCard'
import { cn } from '@/lib/utils'
import { Search, Filter, Calendar } from 'lucide-react'

interface WorkoutHistoryProps {
  entries?: WorkoutHistoryEntry[]
  onEntryClick?: (entry: WorkoutHistoryEntry) => void
  className?: string
}

export function WorkoutHistory({
  entries = MOCK_HISTORY,
  onEntryClick,
  className,
}: WorkoutHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<WorkoutFilterOptions>({ status: [] })

  const filteredEntries = useMemo(() => {
    let results = [...entries]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      results = results.filter(
        (entry) =>
          entry.workoutName.toLowerCase().includes(query) ||
          entry.tags?.some((t) => t.toLowerCase().includes(query)),
      )
    }

    if (filters.status && filters.status.length > 0) {
      results = results.filter((entry) => filters.status!.includes(entry.status))
    }
    if (filters.dateFrom) {
      results = results.filter((entry) => entry.date >= filters.dateFrom!)
    }
    if (filters.dateTo) {
      results = results.filter((entry) => entry.date <= filters.dateTo!)
    }

    return results.sort((a, b) => b.date.localeCompare(a.date))
  }, [entries, searchQuery, filters])

  const groupedEntries = useMemo(() => {
    const groups: Record<string, WorkoutHistoryEntry[]> = {}
    filteredEntries.forEach((entry) => {
      const month = new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
      if (!groups[month]) groups[month] = []
      groups[month].push(entry)
    })
    return groups
  }, [filteredEntries])

  const stats = useMemo(() => {
    const completed = entries.filter((e) => e.status === 'completed').length
    const missed = entries.filter((e) => e.status === 'missed').length
    const totalDuration = entries.reduce((acc, e) => acc + e.duration, 0)
    const avgDuration = entries.length > 0 ? Math.round(totalDuration / entries.length) : 0
    return { completed, missed, totalDuration, avgDuration }
  }, [entries])

  const activeFilterCount = [
    filters.status?.length || 0,
    filters.dateFrom ? 1 : 0,
    filters.dateTo ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const clearFilters = () => {
    setFilters({ status: [] })
    setSearchQuery('')
  }

  const toggleStatus = (status: string) => {
    const current = filters.status || []
    const updated = current.includes(status as never)
      ? current.filter((s) => s !== status)
      : [...current, status as never]
    setFilters((prev) => ({ ...prev, status: updated }))
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with Stats */}
      <div className="flex-shrink-0 p-4 border-b border-white/5 bg-surface-2">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-3 rounded-lg bg-surface-3">
            <p className="text-xl font-bold text-green-500">{stats.completed}</p>
            <p className="text-xs text-white/40">Completed</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-surface-3">
            <p className="text-xl font-bold text-red-500">{stats.missed}</p>
            <p className="text-xs text-white/40">Missed</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-surface-3">
            <p className="text-xl font-bold text-white">{stats.totalDuration}m</p>
            <p className="text-xs text-white/40">Total Time</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-surface-3">
            <p className="text-xl font-bold text-white">{stats.avgDuration}m</p>
            <p className="text-xs text-white/40">Avg Duration</p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workouts..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-surface-3 border border-white/5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand-secondary"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 h-10 px-4 rounded-lg border transition-colors',
              showFilters
                ? 'bg-brand-secondary border-brand-secondary text-white'
                : 'bg-surface-3 border-white/5 text-white/70 hover:border-white/20',
            )}
          >
            <Filter className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full bg-white text-brand-secondary">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 pt-4 border-t border-white/5 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white/70">Filters</p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-sm text-brand-secondary hover:underline">
                  Clear all
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-white/40 mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {['completed', 'missed', 'in_progress'].map((status) => (
                    <button
                      key={status}
                      onClick={() => toggleStatus(status)}
                      className={cn(
                        'px-3 py-1.5 text-sm font-medium rounded-full border capitalize transition-colors',
                        (filters.status || []).includes(status as never)
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'bg-surface-3 border-white/5 text-white/70 hover:border-white/20',
                      )}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-xs text-white/40 mb-2">From</p>
                  <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value || undefined }))}
                    className="w-full h-10 px-3 rounded-lg bg-surface-3 border border-white/5 text-sm text-white"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-white/40 mb-2">To</p>
                  <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value || undefined }))}
                    className="w-full h-10 px-3 rounded-lg bg-surface-3 border border-white/5 text-sm text-white"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Calendar className="w-16 h-16 text-white/20 mb-4" />
            <p className="text-lg font-medium text-white">No workouts found</p>
            <p className="text-sm text-white/40 mt-1">
              {activeFilterCount > 0 ? 'Try adjusting your filters' : 'Complete your first workout to see it here'}
            </p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="mt-4 text-sm text-brand-secondary hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedEntries).map(([month, monthEntries]) => (
              <div key={month}>
                <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">{month}</h3>
                <div className="space-y-2">
                  {monthEntries.map((entry, idx) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <WorkoutHistoryCard entry={entry} onClick={() => onEntryClick?.(entry)} />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
