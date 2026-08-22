// Pure decisions for the active-workout superset flow. Independent of React and stores so
// the uneven-round and re-check rules are explicit and directly testable.
// Clean-room implementation of standard superset round-robin semantics.

import type { WorkoutEntry } from './types'
import { isDone } from './workout-model'

const hasWork = (entries: WorkoutEntry[], idx: number): boolean =>
  !!entries[idx]?.sets?.some(s => !isDone(s) && !(s.skipped === true || s.skipped === 1))

/**
 * A completion is new progress only when it takes this exercise beyond the largest number
 * of simultaneously completed sets seen in this mounted session. Uncheck/re-check therefore
 * does not repeat navigation or rest side effects; completing an added set still can.
 */
export function setProgressHighWater(entry: WorkoutEntry | undefined, previous = 0): { isNew: boolean; highWater: number } {
  const done = entry?.sets?.reduce((count, s) => count + (isDone(s) ? 1 : 0), 0) ?? 0
  return { isNew: done > previous, highWater: Math.max(previous, done) }
}

export interface SupersetStep {
  unitDone: boolean
  roundDone: boolean
  nextIdx: number | null
}

/**
 * Where a newly completed superset set goes next. Spent members are skipped, including
 * across the wrap. A round ends when no later member in display order has work left — the
 * last *active* member is the boundary rather than the group's last array index.
 */
export function supersetFlowStep(entries: WorkoutEntry[], unit: number[], fromIdx: number): SupersetStep | null {
  if (!Array.isArray(entries) || !Array.isArray(unit) || unit.length <= 1) return null
  const pos = unit.indexOf(fromIdx)
  if (pos < 0) return null

  if (!unit.some(idx => hasWork(entries, idx))) {
    return { unitDone: true, roundDone: false, nextIdx: null }
  }

  const wrapped = [...unit.slice(pos + 1), ...unit.slice(0, pos + 1)]
  const nextIdx = wrapped.find(idx => hasWork(entries, idx)) ?? null
  const roundDone = !unit.slice(pos + 1).some(idx => hasWork(entries, idx))
  return { unitDone: false, roundDone, nextIdx }
}
