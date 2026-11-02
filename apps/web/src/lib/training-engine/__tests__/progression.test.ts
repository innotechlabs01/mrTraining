import {
  readSession, sessionsFor, stallCount, nextPrescription, applyPrescription,
  defaultIncrement, policyFor, DELOAD_AFTER, MAX_BW_SETS,
} from '../progression'
import type { ExerciseConfig, LoggedSet, TrainingHistory, WorkoutEntry } from '../types'

const cfg = (over: Partial<ExerciseConfig> = {}): ExerciseConfig => ({
  id: 'ex-1', sets: 3, reps: 8, bodyPart: 'chest', ...over,
})

const entry = (sets: LoggedSet[], target?: Partial<ExerciseConfig>): WorkoutEntry => ({
  id: 'ex-1', sets, ...(target ? { target } : {}),
})

const hit = (weightKg = 60): LoggedSet => ({ completed: 1, weightKg, reps: 8 })
const miss = (weightKg = 60, reps = 5): LoggedSet => ({ completed: 1, weightKg, reps })
const undone = (weightKg = 60): LoggedSet => ({ completed: 0, weightKg, reps: 8 })

describe('progression', () => {
  describe('defaultIncrement', () => {
    it('takes the bigger jump for lower-body lifts', () => {
      expect(defaultIncrement('legs')).toBe(5)
      expect(defaultIncrement('glutes')).toBe(5)
      expect(defaultIncrement('chest')).toBe(2.5)
      expect(defaultIncrement(undefined)).toBe(2.5)
    })
    it('honors pounds', () => {
      expect(defaultIncrement('legs', 'lb')).toBe(10)
    })
  })

  describe('policyFor', () => {
    it('exercise override wins over routine default', () => {
      expect(policyFor(cfg({ prog: 'double' }), 'linear')).toBe('double')
    })
    it('falls back to the routine default, then the mode default', () => {
      expect(policyFor(cfg(), 'greyskull')).toBe('greyskull')
      expect(policyFor(cfg())).toBe('linear')
    })
    it('time-mode work cannot run a reps policy it does not allow', () => {
      expect(policyFor(cfg({ mode: 'time', prog: 'linear' }), 'linear', 'time')).toBe('off')
    })
  })

  describe('readSession — reading a session honestly', () => {
    it('a session that fell apart can never count as a hit', () => {
      // Fewer sets than prescribed -> miss even if every logged set was clean.
      const e = entry([hit(), hit()])
      expect(readSession(e, cfg()).ok).toBe(false)
    })
    it('an unchecked or skipped set is a miss, and warm-ups never poison the read', () => {
      const e = entry([{ phase: 'warmup', completed: 1, weightKg: 30, reps: 10 }, hit(), hit(), { ...undone() }])
      expect(readSession(e, cfg()).ok).toBe(false)
      const skipped = entry([hit(), hit(), { completed: 1, weightKg: 60, reps: 8, skipped: 1 }])
      expect(readSession(skipped, cfg()).ok).toBe(false)
    })
    it('all target reps in all prescribed sets is a hit', () => {
      expect(readSession(entry([hit(), hit(), hit()]), cfg()).ok).toBe(true)
    })
    it('records the AMRAP final set and lowest set for greyskull/double judgement', () => {
      const r = readSession(entry([miss(undefined, 8), miss(undefined, 7), miss(undefined, 11)]), cfg())
      expect(r.amrap).toBe(11)
      expect(r.low).toBe(7)
    })
    it('legacy rows without their own target are judged against the current plan fallback', () => {
      const legacy = entry([hit(100), hit(100), hit(100)])
      expect(readSession(legacy).ok).toBe(false) // no goal at all -> cannot pass
      expect(readSession(legacy, cfg()).ok).toBe(true) // judged vs plan: 3x8 done
    })
    it('time mode reads held seconds against the sec goal', () => {
      const t = cfg({ mode: 'time', sec: 60, sets: 2, reps: 0 })
      expect(readSession(entry([{ completed: 1, sec: 61 }, { completed: 1, sec: 65 }], t), t).ok).toBe(true)
      expect(readSession(entry([{ completed: 1, sec: 45 }, { completed: 1, sec: 65 }], t), t).ok).toBe(false)
    })
  })

  describe('stallCount', () => {
    it('counts consecutive misses back from the most recent session', () => {
      const history: TrainingHistory = [
        { date: '2026-08-01', entries: [entry([hit(50), hit(50), hit(50)])] },
        { date: '2026-08-02', entries: [entry([miss()])] },
        { date: '2026-08-03', entries: [entry([miss()])] },
        { date: '2026-08-04', entries: [entry([miss()])] },
      ]
      expect(stallCount(sessionsFor(history, 'ex-1', cfg()))).toBe(3)
    })
  })

  describe('nextPrescription — linear', () => {
    it('first session sets the baseline', () => {
      expect(nextPrescription([], cfg()).kind).toBe('first')
    })
    it('every rep last time -> weight up by the body-part step, with the reason visible', () => {
      const history: TrainingHistory = [{ date: '2026-08-01', entries: [entry([hit(60), hit(60), hit(60)], cfg())] }]
      const p = nextPrescription(history, cfg())
      expect(p.kind).toBe('up')
      expect(p.weightKg).toBe(62.5)
      expect(p.why?.[0]).toContain('kg more')
    })
    it('missed reps hold the weight and say how many chances remain', () => {
      const history: TrainingHistory = [{ date: '2026-08-01', entries: [entry([miss()], cfg())] }]
      const p = nextPrescription(history, cfg())
      expect(p.kind).toBe('hold')
      expect(p.weightKg).toBe(60)
      expect(p.why?.[0]).toContain('to go')
    })
    it(`three misses in a row trigger a ~10% deload (DELOAD_AFTER linear=${DELOAD_AFTER.linear})`, () => {
      const mk = (d: string): TrainingHistory[number] => ({ date: d, entries: [entry([miss()], cfg())] })
      const history: TrainingHistory = [mk('2026-08-01'), mk('2026-08-02'), mk('2026-08-03')]
      const p = nextPrescription(history, cfg())
      expect(p.kind).toBe('deload')
      expect(p.weightKg).toBeLessThan(60)
      // Snap to the loadable step; never below one step.
      expect(p.weightKg).toBeGreaterThanOrEqual(2.5)
    })
  })

  describe('nextPrescription — greyskull double jump', () => {
    const gcfg = cfg({ prog: 'greyskull' })
    it('beating the target twice on the final AMRAP set earns a double jump', () => {
      const sets: LoggedSet[] = [hit(60), hit(60), { completed: 1, weightKg: 60, reps: 16 }] // target 8 → amrap 16
      const history: TrainingHistory = [{ date: '2026-08-01', entries: [entry(sets, gcfg)] }]
      const p = nextPrescription(history, gcfg)
      expect(p.kind).toBe('up')
      expect(p.weightKg).toBe(65) // 2.5 * 2
    })
    it('one plain failure resets 10% immediately — greyskull has no second chance', () => {
      const sets: LoggedSet[] = [hit(60), miss(60, 4), miss(60, 4)]
      const history: TrainingHistory = [{ date: '2026-08-01', entries: [entry(sets, gcfg)] }]
      const p = nextPrescription(history, gcfg)
      expect(p.kind).toBe('deload')
      expect(p.weightKg).toBeCloseTo(55, 1) // snap(54, 2.5)
    })
  })

  describe('nextPrescription — double progression', () => {
    const dcfg = cfg({ prog: 'double', reps: 10, repsMin: 8 })
    it('reaching the top of the range everywhere adds weight and resets reps to the bottom', () => {
      const sets: LoggedSet[] = [
        { completed: 1, weightKg: 80, reps: 10 }, { completed: 1, weightKg: 80, reps: 10 }, { completed: 1, weightKg: 80, reps: 10 },
      ]
      const p = nextPrescription([{ date: '2026-08-01', entries: [entry(sets, dcfg)] }], dcfg)
      expect(p.kind).toBe('up')
      expect(p.reps).toBe(8)
      expect(p.weightKg).toBe(82.5)
    })
    it('inside the range it holds the weight and aims one step higher than last low', () => {
      const sets: LoggedSet[] = [
        { completed: 1, weightKg: 80, reps: 8 }, { completed: 1, weightKg: 80, reps: 9 }, { completed: 1, weightKg: 80, reps: 9 },
      ]
      const p = nextPrescription([{ date: '2026-08-01', entries: [entry(sets, dcfg)] }], dcfg)
      expect(p.kind).toBe('hold')
      expect(p.reps).toBe(9) // one step above the lowest set (8), still inside the range
      expect(p.weightKg).toBe(80)
    })
  })

  describe('nextPrescription — bodyweight', () => {
    const bcfg = cfg({ bodyPart: undefined, inc: null, sets: 3, reps: 10 })
    it('bodyweight work progresses in reps, not kg', () => {
      const sets: LoggedSet[] = [{ completed: 1, weightKg: 0, reps: 10 }, { completed: 1, weightKg: 0, reps: 10 }, { completed: 1, weightKg: 0, reps: 10 }]
      const p = nextPrescription([{ date: '2026-08-01', entries: [entry(sets, bcfg)] }], bcfg)
      expect(p.kind).toBe('up')
      expect(p.weightKg).toBe(0)
      expect(p.reps).toBe(11)
    })
    it('unilateral totals step by two so both sides get the rep', () => {
      const ucfg = { ...bcfg, perSide: true }
      const sets: LoggedSet[] = [{ completed: 1, reps: 10 }, { completed: 1, reps: 10 }, { completed: 1, reps: 10 }]
      const p = nextPrescription([{ date: '2026-08-01', entries: [entry(sets, ucfg)] }], ucfg)
      // Progression derives from the target (10), and the even step keeps both sides honest.
      expect(p.reps).toBe(12)
    })
    it('past the reps ceiling it adds a set instead of another rep', () => {
      // Target has reached its own ceiling: add a set, keep the rep count.
      const topCfg = { ...bcfg, repsMax: 10 }
      const sets: LoggedSet[] = [{ completed: 1, reps: 10 }, { completed: 1, reps: 10 }, { completed: 1, reps: 10 }]
      const p = nextPrescription([{ date: '2026-08-01', entries: [entry(sets, topCfg)] }], topCfg)
      expect(p.kind).toBe('up')
      expect(p.sets).toBe(4)
      expect(p.reps).toBe(10)
    })
    it(`past ${MAX_BW_SETS} sets the honest advice is load or a harder variation`, () => {
      const topCfg = { ...bcfg, repsMax: 12, reps: 12, sets: MAX_BW_SETS }
      const sets = Array.from({ length: MAX_BW_SETS }, () => ({ completed: 1, reps: 12 }))
      const p = nextPrescription([{ date: '2026-08-01', entries: [entry(sets, topCfg)] }], topCfg)
      expect(p.kind).toBe('hold')
      expect(p.why?.[0]).toMatch(/harder variation|add weight/)
    })
    it('a belted dip has a logged load and follows normal policies instead of rep-growth', () => {
      const dip = { ...bcfg, sets: 3, reps: 8 }
      const sets: LoggedSet[] = [{ completed: 1, weightKg: 10, reps: 8 }, { completed: 1, weightKg: 10, reps: 8 }, { completed: 1, weightKg: 10, reps: 8 }]
      const p = nextPrescription([{ date: '2026-08-01', entries: [entry(sets, dip)] }], dip)
      expect(p.kind).toBe('up')
      expect(p.weightKg).toBeGreaterThan(10)
    })
  })

  describe('nextPrescription — time policy', () => {
    const tcfg = cfg({ mode: 'time', prog: 'time', sec: 60, sets: 2, reps: 0 })
    it('holding every set for the full time bumps the target by 5s', () => {
      const sets: LoggedSet[] = [{ completed: 1, sec: 60 }, { completed: 1, sec: 62 }]
      const p = nextPrescription([{ date: '2026-08-01', entries: [entry(sets, tcfg)] }], tcfg)
      expect(p.kind).toBe('up')
      expect(p.sec).toBe(65)
    })
    it('short holds hold the target, repeated short holds deload', () => {
      const short = [{ completed: 1, sec: 40 }, { completed: 1, sec: 45 }]
      const h = nextPrescription([{ date: '2026-08-01', entries: [entry(short, tcfg)] }], tcfg)
      expect(h.kind).toBe('hold')
      expect(h.sec).toBe(60)
      const history: TrainingHistory = [
        { date: '2026-08-01', entries: [entry(short, tcfg)] },
        { date: '2026-08-02', entries: [entry(short, tcfg)] },
        { date: '2026-08-03', entries: [entry(short, tcfg)] },
      ]
      const d = nextPrescription(history, tcfg)
      expect(d.kind).toBe('deload')
      expect(d.sec).toBeLessThan(60)
    })
  })

  describe('applyPrescription', () => {
    it('rewrites only unlogged work rows, never logged ones and never warm-ups', () => {
      const sets: LoggedSet[] = [
        { phase: 'warmup', completed: 1, weightKg: 30, reps: 10 },
        { completed: 1, weightKg: 60, reps: 8 },
        { completed: 0, weightKg: 60, reps: 8 },
      ]
      const out = applyPrescription(sets, { policy: 'linear', kind: 'up', weightKg: 62.5 })
      expect(out[0].weightKg).toBe(30)
      expect(out[1].weightKg).toBe(60)
      expect(out[2].weightKg).toBe(62.5)
    })
    it('a set-count decision grows the list by copying an existing row, only upwards', () => {
      const sets: LoggedSet[] = [undone(), undone(), undone()]
      const out = applyPrescription(sets, { policy: 'linear', kind: 'up', weightKg: 0, reps: 10, sets: 4 })
      expect(out.filter(s => s.phase !== 'warmup')).toHaveLength(4)
    })
    it('off and first prescriptions leave sets untouched', () => {
      const sets: LoggedSet[] = [undone()]
      expect(applyPrescription(sets, { policy: 'off', kind: 'off' })).toEqual(sets)
      expect(applyPrescription(sets, { policy: 'linear', kind: 'first' })).toEqual(sets)
      expect(applyPrescription(sets, null)).toEqual(sets)
    })
  })
})
