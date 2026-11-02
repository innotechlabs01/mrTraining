import { estimate1RM, bestSetOf, e1rmSeries, best1RM, is1RMRecord, REP_CAP } from '../onerm'
import type { TrainingHistory, WorkoutEntry } from '../../training-engine/types'

const entry = (id: string, sets: WorkoutEntry['sets']): WorkoutEntry => ({ id, sets })

describe('onerm', () => {
  describe('estimate1RM', () => {
    it('returns a single rep unchanged — it is a measurement, not an estimate', () => {
      expect(estimate1RM(140, 1)).toBe(140)
    })
    it('computes Epley by default: w * (1 + r/30)', () => {
      expect(estimate1RM(100, 10)).toBeCloseTo(133.3, 1)
    })
    it('supports brzycki and lombardi formulas', () => {
      expect(estimate1RM(100, 10, 'brzycki')).toBeCloseTo(133.3, 1)
      expect(estimate1RM(100, 10, 'lombardi')).toBeCloseTo(125.9, 1)
    })
    it('refuses to guess above the rep cap', () => {
      expect(REP_CAP).toBe(12)
      expect(estimate1RM(60, 15)).toBeNull()
    })
    it('refuses nonsense inputs instead of inventing numbers', () => {
      expect(estimate1RM(0, 5)).toBeNull()
      expect(estimate1RM(-50, 5)).toBeNull()
      expect(estimate1RM(100, 0)).toBeNull()
      expect(estimate1RM(NaN, 5)).toBeNull()
      // Timed sets have no rep count — they drop out on their own.
      expect(estimate1RM(null, null)).toBeNull()
    })
  })

  describe('bestSetOf', () => {
    it('picks the completed work set with the highest estimate and names which one', () => {
      const e = entry('ex-1', [
        { completed: 1, weightKg: 80, reps: 8 },   // est ~101.3
        { completed: 1, weightKg: 100, reps: 6 },  // est ~120
        { completed: 0, weightKg: 200, reps: 1 },  // not done — ignored
        { phase: 'warmup', completed: 1, weightKg: 150, reps: 1 }, // warmup — ignored
      ])
      expect(bestSetOf(e)).toEqual({ est: 120, weightKg: 100, reps: 6 })
    })
    it('returns null for an entry with no estimable set', () => {
      expect(bestSetOf(entry('ex-1', [{ completed: 1, sec: 45 }]))).toBeNull()
    })
  })

  describe('series / best / record', () => {
    const history: TrainingHistory = [
      { date: '2026-08-01', startedAt: Date.UTC(2026, 7, 1), entries: [entry('ex-1', [{ completed: 1, weightKg: 90, reps: 6 }])] },
      { date: '2026-08-08', startedAt: Date.UTC(2026, 7, 8), entries: [entry('ex-2', [{ completed: 1, weightKg: 40, reps: 10 }])] },
      { date: '2026-08-15', startedAt: Date.UTC(2026, 7, 15), entries: [entry('ex-1', [{ completed: 1, weightKg: 100, reps: 6 }])] },
    ]

    it('builds a chronological series for one exercise only', () => {
      const series = e1rmSeries(history, 'ex-1')
      expect(series).toHaveLength(2)
      expect(series[0].y < series[1].y).toBe(true)
    })
    it('finds the all-time best with its source set and date', () => {
      expect(best1RM(history, 'ex-1')).toMatchObject({ est: 120, weightKg: 100, reps: 6, date: '2026-08-15' })
    })
    it('flags a record when the new entry beats history, carrying the previous value', () => {
      const rec = is1RMRecord(history, 'ex-1', entry('ex-1', [{ completed: 1, weightKg: 105, reps: 6 }]))
      expect(rec?.est).toBeGreaterThan(120)
      expect(rec?.prev).toBe(120)
    })
    it('does not flag when the entry does not beat history', () => {
      expect(is1RMRecord(history, 'ex-1', entry('ex-1', [{ completed: 1, weightKg: 95, reps: 6 }]))).toBeNull()
    })
  })
})
