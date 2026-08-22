// Estimated one-rep max from submaximal sets.
//
// Deliberately knows nothing about the exercise catalog: an estimate needs a weight AND a
// rep count, so cardio ({minutes, speed}) and timed ({sec}) sets drop out of every scan on
// their own. Formulas are the standard submaximal estimators; they agree closely at low reps
// and diverge as reps rise, which is exactly why REP_CAP exists — refusing to guess beats
// printing a fantasy.
//
// Clean-room implementation of published formulas (Epley 1985, Brzycki 1993, Lombardi 1989).

import type { TrainingHistory, WorkoutEntry } from './types'
import { isWarmupRow, isDone } from './workout-model'

/** Above this many reps an estimate says more about work capacity than maximal strength. */
export const REP_CAP = 12

export const FORMULAS = {
  epley: (w: number, r: number) => w * (1 + r / 30),
  brzycki: (w: number, r: number) => (w * 36) / (37 - r),
  lombardi: (w: number, r: number) => w * Math.pow(r, 0.1),
} as const

export type FormulaName = keyof typeof FORMULAS
export const DEFAULT_FORMULA: FormulaName = 'epley'

const round1 = (v: number) => Math.round(v * 10) / 10

/**
 * Estimate a 1RM from one set. Returns null for anything it cannot honestly answer:
 * missing/zero/negative load, no reps, non-finite input, or more reps than REP_CAP.
 * A single rep is not an estimate — it is the measurement — and comes back unchanged.
 */
export function estimate1RM(weightKg: unknown, reps: unknown, formula: FormulaName = DEFAULT_FORMULA): number | null {
  const w = Number(weightKg)
  const r = Number(reps)
  if (!Number.isFinite(w) || !Number.isFinite(r)) return null
  if (w <= 0 || r < 1) return null
  if (r > REP_CAP) return null
  const fn = FORMULAS[formula] ?? FORMULAS[DEFAULT_FORMULA]
  const est = r === 1 ? w : fn(w, Math.round(r))
  if (!Number.isFinite(est) || est <= 0) return null
  return round1(est)
}

export interface BestSet { est: number; weightKg: number; reps: number }

/** Best estimate out of one workout entry's completed work sets. */
export function bestSetOf(entry: WorkoutEntry, formula: FormulaName = DEFAULT_FORMULA): BestSet | null {
  let best: BestSet | null = null
  for (const s of entry?.sets ?? []) {
    if (!isDone(s) || isWarmupRow(s)) continue
    const est = estimate1RM(s.weightKg, s.reps, formula)
    if (est !== null && (!best || est > best.est)) {
      best = { est, weightKg: Number(s.weightKg), reps: Math.round(Number(s.reps)) }
    }
  }
  return best
}

export interface E1rmPoint {
  t: number // epoch ms
  d: string // ISO date
  y: number // estimated 1RM
  weightKg: number
  reps: number
}

/** One point per workout in which the exercise produced an estimate. Chronological. */
export function e1rmSeries(history: TrainingHistory, exerciseId: string, formula: FormulaName = DEFAULT_FORMULA): E1rmPoint[] {
  const pts: E1rmPoint[] = []
  for (const w of history ?? []) {
    const entry = (w.entries ?? []).find(e => e.id === exerciseId)
    if (!entry) continue
    const best = bestSetOf(entry, formula)
    if (best) pts.push({ t: w.startedAt ?? new Date(w.date).getTime(), d: w.date, y: best.est, weightKg: best.weightKg, reps: best.reps })
  }
  return pts
}

export interface Best1RM extends BestSet {
  date: string
  t?: number
  /** The source matters: "142.5 est. from 100×10" is a very different claim from "140×1". */
}

/** All-time best estimate for one exercise, with the set and date it came from. */
export function best1RM(history: TrainingHistory, exerciseId: string, formula: FormulaName = DEFAULT_FORMULA): Best1RM | null {
  let best: Best1RM | null = null
  for (const p of e1rmSeries(history, exerciseId, formula)) {
    if (!best || p.y > best.est) best = { est: p.y, weightKg: p.weightKg, reps: p.reps, date: p.d, t: p.t }
  }
  return best
}

/**
 * Did this workout beat every estimate before it? Used by finish summaries, comparing
 * against history that does not yet contain `entry`.
 */
export function is1RMRecord(
  history: TrainingHistory,
  exerciseId: string,
  entry: WorkoutEntry,
  formula: FormulaName = DEFAULT_FORMULA,
): (BestSet & { prev: number }) | null {
  const now = bestSetOf(entry, formula)
  if (!now) return null
  const prev = best1RM(history, exerciseId, formula)
  return !prev || now.est > prev.est ? { ...now, prev: prev ? prev.est : 0 } : null
}
