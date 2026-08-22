import { setProgressHighWater, supersetFlowStep } from '../superset-flow'
import type { WorkoutEntry, LoggedSet } from '../types'

const e = (sets: LoggedSet[]): WorkoutEntry => ({ id: 'x', sets })

describe('superset-flow', () => {
  const entries: WorkoutEntry[] = [
    e([{ completed: 0 }, { completed: 0 }, { completed: 1 }]), // 0: one done
    e([{ completed: 0 }, { completed: 0 }]),                   // 1
    e([{ completed: 1 }, { completed: 0 }]),                   // 2: one done
  ]

  describe('setProgressHighWater', () => {
    it('uncheck/re-check does not repeat navigation side effects', () => {
      const first = setProgressHighWater(entries[0], 0)
      expect(first).toEqual({ isNew: true, highWater: 1 })
      // Uncheck (back to 2? no—still counts only done sets) then re-check the same set:
      const afterUncheck = setProgressHighWater(entries[0], 1)
      expect(afterUncheck.isNew).toBe(false)
      expect(afterUncheck.highWater).toBe(1)
    })
    it('completing an added set can still be new progress', () => {
      const grown = e([{ completed: 1 }, { completed: 1 }, { completed: 1 }, { completed: 1 }])
      expect(setProgressHighWater(grown, 3).isNew).toBe(true)
    })
  })

  describe('supersetFlowStep', () => {
    it('moves to the next member with work left in display order', () => {
      expect(supersetFlowStep(entries, [0, 1, 2], 0)).toEqual({ unitDone: false, roundDone: false, nextIdx: 1 })
    })
    it('wraps around spent members to find the next active one', () => {
      // From member 2, members after it have no work; wrap finds member 0 or 1.
      const step = supersetFlowStep(entries, [0, 1, 2], 2)
      expect(step?.nextIdx).not.toBe(2)
      expect([0, 1]).toContain(step?.nextIdx)
    })
    it('the round ends at the last active member, not the last array index', () => {
      // Unit [0,1] where 1 is fully spent and 0 still has work.
      const pair: WorkoutEntry[] = [
        e([{ completed: 0 }, { completed: 0 }]),
        e([{ completed: 1 }, { completed: 1 }]),
      ]
      const step = supersetFlowStep(pair, [0, 1], 1) // completing from the spent member
      expect(step?.roundDone).toBe(true)
      expect(step?.unitDone).toBe(false)
    })
    it('reports unitDone once every member is spent', () => {
      const allDone: WorkoutEntry[] = [e([{ completed: 1 }]), e([{ completed: 1 }])]
      expect(supersetFlowStep(allDone, [0, 1], 1)).toEqual({ unitDone: true, roundDone: false, nextIdx: null })
    })
    it('is not a superset for singletons or unknown indices', () => {
      const solo: WorkoutEntry[] = [e([{ completed: 0 }])]
      expect(supersetFlowStep(solo, [0], 0)).toBeNull()
      expect(supersetFlowStep(entries, [0, 1], 2)).toBeNull()
    })
    it('skipped sets count as spent work for flow purposes', () => {
      const withSkip: WorkoutEntry[] = [
        e([{ completed: 0 }, { completed: 0 }]),
        e([{ skipped: 1 }, { skipped: 1 }]), // athlete marked these skipped
      ]
      const step = supersetFlowStep(withSkip, [0, 1], 0)
      expect(step?.roundDone).toBe(true)
    })
  })
})
