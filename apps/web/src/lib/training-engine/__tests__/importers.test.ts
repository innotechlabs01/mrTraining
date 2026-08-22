import { parseWorkoutCsv, matchToLibrary, normalizeExerciseName, inferMode } from '../importers'
import type { LibraryLike } from '../importers'

const library: LibraryLike[] = [
  { id: 'ex-2', slug: 'bench-press', name: 'Bench Press' },
  { id: 'ex-4', slug: 'pull-ups', name: 'Pull-Ups' },
  { id: 'ex-8', slug: 'plank', name: 'Plank' },
]

describe('importers', () => {
  describe('parseWorkoutCsv — Strong-style export', () => {
    const strongCsv = [
      'Date,Workout Name,Exercise Name,Set Order,Weight,Reps,RPE',
      '2026-08-01,Push Day,Bench Press,1,80,8,',
      '2026-08-01,Push Day,Bench Press,2,80,7,"8.5"',
      '2026-08-02,Pull Day,"Pull-Ups (weighted)",1,10,8,',
    ].join('\n')

    it('normalizes rows with dates and per-exercise set order', () => {
      const rows = parseWorkoutCsv(strongCsv)
      expect(rows).toHaveLength(3)
      expect(rows[0]).toMatchObject({ date: '2026-08-01', exerciseName: 'Bench Press', setIndex: 1, weightKg: 80, reps: 8 })
      expect(rows[1].setIndex).toBe(2)
      expect(rows[1].rpe).toBe(8.5) // quoted numeric fields parse
    })

    it('throws a clear error when required columns are missing', () => {
      expect(() => parseWorkoutCsv('a,b\n1,2')).toThrow(/date/i)
    })
  })

  describe('parseWorkoutCsv — FitNotes-style export', () => {
    it('maps "Exercise" and "Time (hh:mm:ss)"-free headers via aliases', () => {
      const csv = [
        'Date,Exercise,Category,Weight (kg),Reps,Time',
        '"03/15/2026",Plank,Core,,,45s',
      ].join('\n')
      const rows = parseWorkoutCsv(csv)
      expect(rows[0].exerciseName).toBe('Plank')
    })
  })

  describe('matchToLibrary', () => {
    it('matches case/punctuation-insensitive exact names', () => {
      const r = matchToLibrary(['bench press', 'PULLUPS'], library)
      expect(r.unmatched).toEqual([])
      expect(r.matched.get(normalizeExerciseName('bench press'))?.id).toBe('ex-2')
      // pullups -> normalized "pullups"; "pull-ups" normalizes to same
      expect(r.matched.get('pullups')?.id).toBe('ex-4')
    })
    it('keeps ambiguous contains-matches unmatched rather than guessing', () => {
      const lib: LibraryLike[] = [
        { id: 'a', slug: 'curl-barbell', name: 'Barbell Curl' },
        { id: 'b', slug: 'curl-dumbbell', name: 'Dumbbell Curl' },
      ]
      const r = matchToLibrary(['Curl'], lib)
      expect(r.unmatched).toEqual(['Curl'])
    })
    it('reports unknown names as custom-exercise candidates', () => {
      const r = matchToLibrary(['Zercher Squat'], library)
      expect(r.unmatched).toEqual(['Zercher Squat'])
    })
  })

  describe('inferMode', () => {
    it('reps when weights+reps present; time when only durations are', () => {
      const base = { date: 'd', workoutName: '', exerciseName: '', setIndex: 1 }
      expect(inferMode([{ ...base, weightKg: 60, reps: 8, sec: null, minutes: null, rpe: null }])).toBe('reps')
      expect(inferMode([{ ...base, weightKg: null, reps: null, sec: 45, minutes: null, rpe: null }])).toBe('time')
    })
  })
})
