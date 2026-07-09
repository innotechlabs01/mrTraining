'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sun, Dumbbell, Heart, Apple, Users, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAthleteDay } from '@/features/athlete/hooks/useToday'
import { ATHLETE_NAME } from '@/features/athlete/data/_mocks'
import type { AthleteBlockId } from '@/features/athlete/types'

const BLOCK_ICONS: Record<AthleteBlockId, React.ReactNode> = {
  morning: <Sun className="w-4 h-4" />,
  workout: <Dumbbell className="w-4 h-4" />,
  recovery: <Heart className="w-4 h-4" />,
  nutrition: <Apple className="w-4 h-4" />,
  community: <Users className="w-4 h-4" />,
  night: <Moon className="w-4 h-4" />,
}

const BLOCK_NAMES: Record<AthleteBlockId, string> = {
  morning: 'Morning',
  workout: 'Workout',
  recovery: 'Recovery',
  nutrition: 'Nutrition',
  community: 'Community',
  night: 'Night Summary',
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function AthleteLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { blocks, currentBlock, navigateBlock, setCurrentBlock } = useAthleteDay()

  useEffect(() => {
    const match = pathname.match(/\/athlete\/today\/(\w+)/)
    const blockFromUrl = match?.[1] as AthleteBlockId | undefined
    if (blockFromUrl) {
      setCurrentBlock(blockFromUrl)
    }
  }, [pathname, setCurrentBlock])

  const handleNavClick = (blockId: AthleteBlockId) => {
    navigateBlock(blockId)
    router.push(`/athlete/today/${blockId}`)
  }

  return (
    <div className="min-h-screen bg-surface-0">
      <header className="fixed top-0 left-0 right-0 z-40 bg-surface-1 border-b border-white/5">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-14">
          <div>
            <p className="text-xs text-white/50">{getGreeting()}</p>
            <p className="text-base font-semibold text-white">{ATHLETE_NAME}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
              {BLOCK_ICONS[currentBlock]}
              <span className="text-xs font-medium text-orange-500">{BLOCK_NAMES[currentBlock]}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-sm font-semibold text-white">
              {ATHLETE_NAME.charAt(0)}
            </div>
          </div>
        </div>
      </header>

      <main className="pt-14 pb-28">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface-2 border-t border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <p className="text-center text-[10px] text-white/40 uppercase tracking-wider mb-3">
            {BLOCK_NAMES[currentBlock]}
          </p>
          <div className="flex items-center justify-between">
            {blocks.map((block) => {
              const isActive = block.id === currentBlock
              return (
                <button
                  key={block.id}
                  onClick={() => handleNavClick(block.id)}
                  className="relative flex flex-col items-center gap-1"
                  aria-label={BLOCK_NAMES[block.id]}
                >
                  <motion.div
                    animate={{ scale: isActive ? 1.25 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                      isActive
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                        : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'
                    )}
                  >
                    {BLOCK_ICONS[block.id]}
                  </motion.div>
                </button>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
