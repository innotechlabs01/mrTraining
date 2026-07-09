'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useToday } from '../../hooks/useToday'
import { TimeBlockCard } from '../timeline/TimeBlockCard'

export function TimelineSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { blocks } = useToday()
  const pathname = usePathname()
  const router = useRouter()

  const currentBlockId = blocks.find((b) => pathname.endsWith(b.id))?.id ?? null

  const handleClick = (id: string) => {
    router.push(`/coach/today/${id}`)
    onClose()
  }

  return (
    <aside
      className={`
        fixed left-0 top-0 w-60 h-screen bg-surface-1 border-r border-surface-4 z-30 flex flex-col
        transition-transform duration-300 ease-out
        lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}
      aria-label="Time block navigation"
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-brand-primary/10 text-brand-primary font-display font-bold text-sm leading-none">
          MR
        </div>
        <span className="font-display text-sm font-semibold text-white/90 tracking-wide">
          Coach OS
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-hide">
        {blocks.map((block) => (
          <TimeBlockCard
            key={block.id}
            block={block}
            isActive={block.id === currentBlockId}
            onClick={() => handleClick(block.id)}
          />
        ))}
      </nav>
    </aside>
  )
}
