import { fatigueByMuscle, balanceByMuscle, neglectedMuscles, classifyFatigue, halfLifeDecay, FATIGUE_HALF_LIFE_MS, STRENGTH_FULL_MS, STRENGTH_HALF_LIFE_MS, STRENGTH_FLOOR } from '../fatigue'
import type { TrainingHistory } from '../types'

const DAY = 86400000

const workout = (ageDays: number, entries: TrainingHistory[number]['entries']): TrainingHistory[number] => ({
  date: new Date(Date.now() - ageDays * DAY).toISOString().slice(0, 10),
  startedAt: Date.now() - ageDays * DAY,
  entries,
})

describe('fatigue', () => {
  it('half-life decay is exact at one half-life', () => {
    expect(halfLifeDecay(FATIGUE_HALF_LIFE_MS, FATIGUE_HALF_LIFE_MS)).toBeCloseTo(0.5, 10)
  })
  it('classify buckets: below .25 ready, .25–.5 recovering, above .5 fatigued', () => {
    expect(classifyFatigue(0.1)).toBe('ready')
    expect(classifyFatigue(0.3)).toBe('recovering')
    expect(classifyFatigue(0.7)).toBe('fatigued')
  })

  describe('fatigueByMuscle', () => {
    it('a fresh heavy session on chest reads fatigued while untouched muscles do not appear', () => {
      // 3x8 @100kg = 2400kg tonnage -> saturation (1 - e^(-2400/2000)) ≈ 0.70
      const history: TrainingHistory = [workout(0, [{ id: 'bench', target: { muscleGroups: ['chest'] }, sets: Array.from({ length: 6 }, () => ({ completed: 1, weightKg: 100, reps: 8 })) }])]
      const map = fatigueByMuscle(history)
      const chest = map.get('chest')!
      expect(chest.state).toBe('fatigued')
      expect(chest.level).toBeGreaterThan(0.5)
      expect(map.has('back')).toBe(false)
    })
    it('fatigue decays with the 36h half-life — two days later it is mostly recovered', () => {
      const mk = (ageDays: number): TrainingHistory => [workout(ageDays, [
        { id: 'bench', target: { muscleGroups: ['chest'] }, sets: Array.from({ length: 4 }, () => ({ completed: 1, weightKg: 100, reps: 5 })) },
      ])]
      const now = Date.now()
      const fresh = fatigueByMuscle(mk(0), now).get('chest')!.level
      const twoDays = fatigueByMuscle(mk(2), now).get('chest')!.level
      expect(twoDays).toBeLessThan(fresh)
      expect(twoDays / fresh).toBeCloseTo(halfLifeDecay(2 * DAY, FATIGUE_HALF_LIFE_MS), 3)
    })
    it('sessions older than the fatigue scan contribute no fatigue but still read as detrained', () => {
      const history: TrainingHistory = [workout(45, [
        { id: 'bench', target: { muscleGroups: ['chest'] }, sets: Array.from({ length: 10 }, () => ({ completed: 1, weightKg: 200, reps: 10 })) },
      ])]
      const chest = fatigueByMuscle(history).get('chest')!
      expect(chest.level).toBe(0) // outside the 30-day fatigue window
      expect(chest.state).toBe('ready')
      expect(chest.strength).toBeLessThan(1) // yet the strength pass still sees it
    })
    it('bodyweight and timed work still register through their proxies', () => {
      const history: TrainingHistory = [workout(0, [
        { id: 'pullups', target: { muscleGroups: ['back'] }, sets: [{ completed: 1, weightKg: 0, reps: 10 }] },
        { id: 'plank', target: { muscleGroups: ['core'] }, sets: [{ completed: 1, sec: 60 }] },
      ])]
      const map = fatigueByMuscle(history)
      expect(map.get('back')!.level).toBeGreaterThan(0)
      expect(map.get('core')!.level).toBeGreaterThan(0)
    })
    it('entries without a muscle mapping fall into one anonymous bucket instead of vanishing', () => {
      const history: TrainingHistory = [workout(0, [
        { id: 'mystery', sets: [{ completed: 1, weightKg: 60, reps: 8 }] },
      ])]
      expect(fatigueByMuscle(history).has('unmapped')).toBe(true)
    })
    it('strength stays full inside the retention window then decays toward the floor', () => {
      const history = (ageDays: number): TrainingHistory => [workout(ageDays, [
        { id: 'sq', target: { muscleGroups: ['legs'] }, sets: [{ completed: 1, weightKg: 140, reps: 5 }] },
      ])]
      const now = Date.now()
      expect(fatigueByMuscle(history(1), now).get('legs')!.strength).toBe(1)
      const old = fatigueByMuscle(history(120), now).get('legs')!
      expect(old.strength).toBeGreaterThanOrEqual(STRENGTH_FLOOR)
      expect(old.strength).toBeLessThan(1)
      // At ~2 retention+half-lives past full, retained strength approaches the floor.
      const muchOlder = fatigueByMuscle(history(14 + 56), now).get('legs')!
      expect(muchOlder.strength).toBeCloseTo(STRENGTH_FLOOR + (1 - STRENGTH_FLOOR) * Math.pow(0.5, 56 * DAY / STRENGTH_HALF_LIFE_MS), 3)
      void STRENGTH_FULL_MS
    })
  })

  describe('balanceByMuscle / neglectedMuscles', () => {
    it('shares sum to 1 across trained muscles over the window', () => {
      const history: TrainingHistory = [
        workout(1, [{ id: 'bench', target: { muscleGroups: ['chest'] }, sets: [{ completed: 1, weightKg: 100, reps: 10 }] }]),
        workout(2, [{ id: 'row', target: { muscleGroups: ['back'] }, sets: [{ completed: 1, weightKg: 100, reps: 10 }] }]),
        workout(40, [{ id: 'old-squat', target: { muscleGroups: ['legs'] }, sets: [{ completed: 1, weightKg: 500, reps: 10 }] }]),
      ]
      const rows = [...balanceByMuscle(history, 7).values()]
      const sum = rows.reduce((a, r) => a + r.share, 0)
      expect(rows.map(r => r.muscle).sort()).toEqual(['back', 'chest']) // 40-day session outside window
      expect(sum).toBeCloseTo(1, 6)
    })
    it('names plan muscles absent from the training window', () => {
      const history: TrainingHistory = [workout(1, [
        { id: 'bench', target: { muscleGroups: ['chest'] }, sets: [{ completed: 1, weightKg: 80, reps: 8 }] },
      ])]
      expect(neglectedMuscles(['Chest', 'Legs ', 'Back'], history, 7)).toEqual(['legs', 'back'])
    })
  })
})
