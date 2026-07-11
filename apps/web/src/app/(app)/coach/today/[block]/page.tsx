'use client'

import { useParams } from 'next/navigation'
import type { TimeBlockId } from '@/features/coach/types'
import { useToday } from '@/features/coach/hooks/useToday'
import { TimeBlockContent } from '@/features/coach/components/timeline/TimeBlockContent'
import { BLOCK_LABELS, BlockSuspense } from '@/features/coach/components/timeline/blockRegistry'

function BlockFallback({ blockId }: { blockId: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="rounded-xl border border-white/5 bg-surface-1 p-8 max-w-sm">
        <p className="text-lg font-semibold text-white">Bloque no encontrado</p>
        <p className="text-sm text-white/40 mt-2">
          &ldquo;{blockId}&rdquo; no corresponde a ningún bloque del día.
        </p>
        <p className="text-xs text-white/30 mt-1">Selecciona un bloque desde el panel Today.</p>
      </div>
    </div>
  )
}

function BlockView({ blockId }: { blockId: string }) {
  const { blocks } = useToday()
  const block = blocks.find((b) => b.id === blockId)

  if (!block) return <BlockFallback blockId={blockId} />

  return (
    <TimeBlockContent key={blockId}>
      <BlockSuspense blockId={blockId as TimeBlockId} />
    </TimeBlockContent>
  )
}

export default function CoachBlockPage() {
  const params = useParams()
  const blockId = params.block as string

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <BlockView blockId={blockId} />
    </div>
  )
}
