import { rirOf, toScale, avgRir, effortSummary, effortWeeks, effortHistogram, isHardSet, hasEffort, HARD_RIR, MIN_RATED } from '../effort'
import type { TrainingHistory, WorkoutRecord } from '../types'

const day = (n: number): string => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

const workout = (daysAgo: number, sets: Array<{ rir?: number; rpe?: number }>): WorkoutRecord => ({
  date: day(daysAgo),
  startedAt: Date.now() - daysAgo * 86400000,
  entries: [{ id: 'ex-1', sets: sets.map(s => ({ completed: 1, ...s })) }],
})

describe('effort', () => {
  it('RIR passes through; RPE converts with the shared zero at failure', () => {
    expect(rirOf({ rir: 2 })).toBe(2)
    expect(rirOf({ rpe: 8 })).toBe(2) // RPE 8 == RIR 2
    expect(rirOf({})).toBeNull() // never rated is null, not zero
    expect(rirOf({ rir: 0 })).toBe(0) // failure is a rating
  })
  it('toScale converts back for display', () => {
    expect(toScale('rpe', 2)).toBe(8)
    expect(toScale('rir', 2)).toBe(2)
    expect(toScale('rir', null)).toBeNull()
  })
  it(`averages below ${MIN_RATED} rated sets are noise and come back as null`, () => {
    const history: TrainingHistory = [
      workout(1, [{ rir: 1 }, { rir: 2 }, { rir: 3 }, { rir: 1 }]),
    ]
    const s = effortSummary(history)
    expect(s.rated).toBe(4)
    expect(s.avg).toBeNull()
  })
  it('the summary separates done vs rated vs hard — partial coverage is the normal case', () => {
    const history: TrainingHistory = [
      workout(1, [
        { rir: 1 }, { rir: 2 }, { rir: 3 }, { rir: 4 }, { rir: 5 }, {}, {}, {},
      ]),
    ]
    const s = effortSummary(history)
    expect(s.done).toBe(8)
    expect(s.rated).toBe(5)
    // avg RIR = (1+2+3+4+5)/5 = 3; hard (<= HARD_RIR=3) = 3/5
    expect(s.avg).toBeCloseTo(3, 5)
    expect(s.hardPct).toBeCloseTo(0.6, 5)
  })
  it('windows limit the scan to recent days', () => {
    const history: TrainingHistory = [
      workout(40, [{ rir: 0 }, { rir: 0 }, { rir: 0 }, { rir: 0 }, { rir: 0 }]),
      workout(1, [{ rir: 4 }, { rir: 4 }, { rir: 4 }, { rir: 4 }, { rir: 4 }]),
    ]
    expect(effortSummary(history, 7).avg).toBeCloseTo(4, 5)
    expect(effortSummary(history).avg).toBeLessThan(4)
  })
  it('weekly points drop weeks with a single rated set rather than drawing noise', () => {
    const history: TrainingHistory = [
      workout(14, [{ rir: 1 }, { rir: 2 }, { rir: 1 }]), // week A
      workout(7, [{ rir: 5 }]),                            // single rated set — dropped
      workout(0, [{ rir: 3 }, { rir: 3 }, { rir: 3 }]),   // week C
    ]
    const weeks = effortWeeks(history)
    expect(weeks).toHaveLength(2)
    expect(weeks[0].ratedSets).toBeGreaterThanOrEqual(2)
  })
  it('the histogram collapses everything past the top bucket into the tail', () => {
    const history: TrainingHistory = [workout(1, [
      { rir: 0 }, { rir: 1 }, { rir: 2 }, { rir: 3.5 }, { rir: 6 },
    ])]
    const bins = effortHistogram(history)
    // 0 -> bin0, 1 -> bin1, 2 -> bin2, 3.5 -> bin3 (floor), 6 -> collapsed into the "4+" tail.
    expect(bins.map(b => b.n)).toEqual([1, 1, 1, 1, 1])
    expect(bins[4].tail).toBe(true)
  })
  it('isHardSet marks only sets at or below the hard line', () => {
    expect(isHardSet({ rir: 3 })).toBe(true)
    expect(isHardSet({ rir: 4 })).toBe(false)
    expect(isHardSet({ rpe: 7 })).toBe(true) // == RIR 3
    expect(isHardSet({})).toBe(false)
  })
  it('hasEffort decides whether the whole UI exists', () => {
    expect(hasEffort([workout(1, [{ rir: 2 }])])).toBe(true)
    expect(hasEffort([workout(1, [{}, {}])])).toBe(false)
    expect(HARD_RIR).toBe(3)
  })
})
