'use client'

import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCoachPanel } from './CoachPanelContext'

function PanelContent() {
  const { panel } = useCoachPanel()

  if (!panel.type) return null

  switch (panel.type) {
    case 'athlete': {
      const { name, sport, readiness } = panel.data as {
        name?: string
        sport?: string
        readiness?: { sleep: number; hrv: number; recovery: number; score: number }
      }
      return (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-hover flex items-center justify-center text-white text-lg font-bold">
              {name?.charAt(0) ?? '?'}
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">{name ?? 'Athlete'}</h3>
              <p className="text-sm text-[#9CA3AF]">{sport ?? '—'}</p>
            </div>
          </div>

          {readiness && (
            <div className="glass-card rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                Readiness
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Sleep', value: readiness.sleep, unit: 'h' },
                  { label: 'HRV', value: readiness.hrv, unit: '' },
                  { label: 'Recovery', value: readiness.recovery, unit: '%' },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="text-lg font-bold text-white">
                      {item.value}
                      {item.unit}
                    </div>
                    <div className="text-[10px] text-[#6B7280] uppercase tracking-wider mt-0.5">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 px-3 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hover transition-colors"
            >
              Message
            </button>
            <button
              type="button"
              className="flex-1 px-3 py-2 rounded-lg bg-surface-3 text-white text-xs font-semibold hover:bg-surface-5 border border-surface-5 transition-colors"
            >
              Add Note
            </button>
          </div>
        </div>
      )
    }

    case 'message': {
      const { senderName, content } = panel.data as {
        senderName?: string
        content?: string
      }
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Message</h3>
          <div className="glass-card rounded-lg p-4">
            {senderName ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">{senderName}</p>
                <p className="text-sm text-[#9CA3AF]">{content ?? 'No content'}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-[#6B7280]">Select a conversation</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    case 'session': {
      const { name, time, location, status } = panel.data as {
        name?: string
        time?: string
        location?: string
        status?: string
      }
      return (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">{name ?? 'Session'}</h3>
              <p className="text-xs text-[#9CA3AF] mt-0.5">{time ?? '—'}</p>
            </div>
            {status && (
              <span className="px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary text-[10px] font-semibold uppercase">
                {status}
              </span>
            )}
          </div>

          {location && (
            <div className="glass-card rounded-lg p-3">
              <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">Location</p>
              <p className="text-sm text-white">{location}</p>
            </div>
          )}
        </div>
      )
    }

    default:
      return null
  }
}

export function RightPanel() {
  const { panel, closePanel } = useCoachPanel()

  return (
    <AnimatePresence>
      {panel.type && (
        <motion.aside
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed right-0 top-14 bottom-0 w-full max-w-[400px] bg-surface-1 border-l border-surface-4 z-40 overflow-y-auto shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="Detail panel"
        >
          <div className="relative p-5">
            <button
              type="button"
              onClick={closePanel}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-surface-3 transition-colors"
              aria-label="Close panel"
            >
              <X size={16} />
            </button>
            <PanelContent />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
