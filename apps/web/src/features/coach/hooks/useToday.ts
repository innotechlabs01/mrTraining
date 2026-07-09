'use client'

import { useMemo } from 'react'
import type { TimeBlock, TimeBlockId } from '../types'
import { MOCK_TIME_BLOCKS } from '../data/_mocks'

function getBlockStatus(block: TimeBlock): 'upcoming' | 'current' | 'past' {
  const now = new Date()
  const [hourStr, minuteStr, ampm] = block.time.match(/(\d+):(\d+)\s*(AM|PM)/)?.slice(1) ?? []
  let hour = parseInt(hourStr)
  const minute = parseInt(minuteStr)
  if (ampm === 'PM' && hour !== 12) hour += 12
  if (ampm === 'AM' && hour === 12) hour = 0

  const blockStart = new Date(now)
  blockStart.setHours(hour, minute, 0, 0)

  const [endHourStr, endMinuteStr, endAmpm] = block.endTime.match(/(\d+):(\d+)\s*(AM|PM)/)?.slice(1) ?? []
  let endHour = parseInt(endHourStr)
  const endMinute = parseInt(endMinuteStr)
  if (endAmpm === 'PM' && endHour !== 12) endHour += 12
  if (endAmpm === 'AM' && endHour === 12) endHour = 0

  const blockEnd = new Date(now)
  blockEnd.setHours(endHour, endMinute, 0, 0)

  if (now < blockStart) return 'upcoming'
  if (now > blockEnd) return 'past'
  return 'current'
}

export function useToday() {
  const blocks = useMemo(
    () => MOCK_TIME_BLOCKS.map((b) => ({ ...b, status: getBlockStatus(b) })),
    [],
  )

  const currentBlock = useMemo(
    () => blocks.find((b) => b.status === 'current') ?? blocks[0],
    [blocks],
  )

  const currentBlockId = currentBlock.id as TimeBlockId

  return {
    blocks,
    currentBlock,
    currentBlockId,
    date: 'Today',
    isLoading: false,
    error: null,
  }
}
