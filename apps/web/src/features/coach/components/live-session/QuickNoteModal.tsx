'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, StickyNote } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickNoteModalProps {
  athleteName?: string
  onClose: () => void
  onSave: (note: string, tags: string[]) => void
}

const PRESET_TAGS = ['Great form', 'Needs work', 'Injury concern', 'Motivation boost']

export default function QuickNoteModal({ athleteName, onClose, onSave }: QuickNoteModalProps) {
  const [note, setNote] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  const handleSave = () => {
    if (!note.trim()) return
    onSave(note.trim(), selectedTags)
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
        className="w-full max-w-md bg-surface-2 rounded-xl border border-white/10"
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-brand-primary" />
            <h3 className="text-lg font-semibold font-display">
              {athleteName ? `Quick Note about ${athleteName}` : 'Quick Note'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface-5 text-secondary hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Type your note..."
            rows={4}
            className="w-full bg-surface-4 border border-white/10 rounded-md p-3 text-sm text-white placeholder:text-[#6B7280] resize-none outline-none focus:border-brand-primary/50 transition-colors"
          />

          <div>
            <p className="text-xs text-[#6B7280] mb-2">Tags</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_TAGS.map((tag) => {
                const selected = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      selected
                        ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                        : 'bg-surface-5 text-secondary hover:bg-surface-6 border border-transparent',
                    )}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-white/5">
          <button
            disabled={!note.trim()}
            onClick={handleSave}
            className={cn(
              'w-full h-11 rounded-md font-semibold text-sm transition-colors',
              note.trim()
                ? 'bg-brand-primary hover:bg-brand-primary-hover text-white'
                : 'bg-surface-5 text-[#6B7280] cursor-not-allowed',
            )}
          >
            Save Note
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
