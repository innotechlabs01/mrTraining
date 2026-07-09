'use client'

import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface TimeBlockContentProps {
  children: ReactNode
  isLoading?: boolean
}

export function TimeBlockContent({ children, isLoading }: TimeBlockContentProps) {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center justify-center h-64"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />
            <span className="text-xs text-[#6B7280]">Loading...</span>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
