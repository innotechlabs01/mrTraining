'use client'

import { useQuery } from '@tanstack/react-query'
import type { TimeBlock, TimeBlockId } from '../types'
import { coachingApi } from '@/features/shared/api/client'

function getBlockStatus(block: TimeBlock): 'upcoming' | 'current' | 'past' {
  const now = new Date()
  const match = block.time.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return 'upcoming'
  let hour = parseInt(match[1])
  const minute = parseInt(match[2])
  const ampm = match[3].toUpperCase()
  if (ampm === 'PM' && hour !== 12) hour += 12
  if (ampm === 'AM' && hour === 12) hour = 0

  const blockStart = new Date(now)
  blockStart.setHours(hour, minute, 0, 0)

  const endMatch = block.endTime.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!endMatch) return 'upcoming'
  let endHour = parseInt(endMatch[1])
  const endMinute = parseInt(endMatch[2])
  const endAmpm = endMatch[3].toUpperCase()
  if (endAmpm === 'PM' && endHour !== 12) endHour += 12
  if (endAmpm === 'AM' && endHour === 12) endHour = 0

  const blockEnd = new Date(now)
  blockEnd.setHours(endHour, endMinute, 0, 0)

  if (now < blockStart) return 'upcoming'
  if (now > blockEnd) return 'past'
  return 'current'
}

export function useToday() {
  const { data: rawBlocks = [], isLoading, error: queryError } = useQuery({
    queryKey: ['today', 'time-blocks'],
    queryFn: () => coachingApi.getTimeBlocks<TimeBlock[]>(),
    staleTime: 30_000,
  })

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null

  const blocks = rawBlocks.map((b: TimeBlock) => ({ ...b, status: getBlockStatus(b) }))
  const currentBlock = blocks.find((b) => b.status === 'current') ?? blocks[0] ?? null
  const currentBlockId = (currentBlock?.id ?? null) as TimeBlockId | null

  return {
    blocks,
    currentBlock,
    currentBlockId,
    date: 'Today',
    isLoading,
    error,
  }
}