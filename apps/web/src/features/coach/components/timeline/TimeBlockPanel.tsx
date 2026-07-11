'use client'

import { useRouter } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import type { TimeBlockId } from '@/features/coach/types'
import { BLOCK_LABELS, BlockSuspense } from '@/features/coach/components/timeline/blockRegistry'

export function TimeBlockPanel({ blockId }: { blockId: string }) {
  const router = useRouter()
  const label = BLOCK_LABELS[blockId] ?? blockId

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-brand-primary/80">
            Bloque de hoy
          </p>
          <h3 className="text-base font-semibold text-white">{label}</h3>
        </div>
        <button
          onClick={() => router.push(`/coach/today/${blockId}`)}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          Abrir página <ArrowUpRight size={13} />
        </button>
      </div>
      <div className="rounded-xl border border-white/5 bg-surface-0 p-3">
        <BlockSuspense blockId={blockId as TimeBlockId} />
      </div>
    </div>
  )
}
