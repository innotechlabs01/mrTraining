'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Exercises', href: '/coach/workouts/exercises' },
  { label: 'Builder', href: '/coach/workouts/builder' },
  { label: 'Templates', href: '/coach/workouts/templates' },
  { label: 'Schedule', href: '/coach/workouts/schedule' },
]

export default function WorkoutsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-surface-0">
      <nav className="sticky top-14 z-30 bg-surface-0 border-b border-white/5">
        <div className="flex items-center gap-1 px-6 max-w-6xl mx-auto">
          {TABS.map(tab => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'relative px-4 py-3 text-sm font-medium transition-colors',
                  active ? 'text-white' : 'text-white/40 hover:text-white/60',
                )}
              >
                {tab.label}
                {active && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
      <div>{children}</div>
    </div>
  )
}
