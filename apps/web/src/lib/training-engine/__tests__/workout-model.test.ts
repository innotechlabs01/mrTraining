import { modeForEntry, modeForSet, phaseForSet, isWarmupRow, isSkippedRow, normalizeMode } from '../workout-model'
import type { LoggedSet } from '../types'

// Raw DB rows carry untyped legacy values; tests exercise those spellings via casts.
const raw = (o: object) => o as LoggedSet

describe('workout-model', () => {
  describe('phaseForSet', () => {
    it('treats rows without a phase as work', () => {
      expect(phaseForSet({ completed: 1 })).toBe('work')
    })
    it('honors an explicit warmup phase', () => {
      expect(phaseForSet({ phase: 'warmup' })).toBe('warmup')
      expect(isWarmupRow({ phase: 'warmup' })).toBe(true)
      expect(isWarmupRow({ completed: 1 })).toBe(false)
    })
    it('normalizes legacy warmup spellings', () => {
      expect(phaseForSet(raw({ phase: 'Warm-Up' }))).toBe('warmup')
      expect(phaseForSet(raw({ phase: 'warm_up' }))).toBe('warmup')
    })
  })

  describe('isSkippedRow', () => {
    it('detects skipped sets in both boolean and numeric form', () => {
      expect(isSkippedRow({ skipped: true })).toBe(true)
      expect(isSkippedRow({ skipped: 1 })).toBe(true)
      expect(isSkippedRow({})).toBe(false)
    })
  })

  describe('modeForSet / modeForEntry', () => {
    it('defaults to reps when nothing says otherwise', () => {
      expect(modeForSet(undefined, {})).toBe('reps')
    })
    it('infers time mode from a sec target even on legacy rows without explicit mode', () => {
      expect(modeForSet(undefined, { sec: 60 })).toBe('time')
      expect(modeForEntry({ id: 'x', target: { sec: 60 }, sets: [{ completed: 1, sec: 55 }] })).toBe('time')
    })
    it('infers cardio from minutes/speed fields', () => {
      expect(modeForSet({ minutes: 20, speed: 12 }, {})).toBe('cardio')
    })
    it('an explicit row mode wins over the parent target', () => {
      expect(modeForSet(raw({ mode: 'time' }), { reps: 10 })).toBe('time')
    })
    it('returns null for intentionally mixed work-row modes', () => {
      const entry = { id: 'x', sets: [raw({ mode: 'reps', completed: 1 }), raw({ mode: 'time', completed: 1 })] }
      expect(modeForEntry(entry)).toBeNull()
    })
    it('normalizeMode falls back safely', () => {
      expect(normalizeMode('TIME')).toBe('time')
      expect(normalizeMode('nonsense', 'cardio')).toBe('cardio')
      expect(normalizeMode(undefined)).toBe('reps')
    })
  })
})
