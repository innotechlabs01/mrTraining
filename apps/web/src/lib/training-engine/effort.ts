// Effort as a statistic: one internal scale (RIR), both display scales.
//
// A set carries either `rir` or `rpe` and is never rewritten. For a chart that is a
// problem — mixed history would draw two half-empty series — so everything aggregates in
// RIR and converts back for display. RIR is the internal unit because it has a real zero
// (a set taken to failure); RPE 8 == RIR 2.
//
// Clean-room implementation of the standard RIR/RPE equivalence.

import type { LoggedSet, TrainingHistory, WorkoutEntry, WorkoutRecord } from './types'
import { isWarmupRow, isDone } from './workout-model'

/** At or below this a set is close enough to failure to drive adaptation. */
export const HARD_RIR = 3

/** Below this many rated sets an average is noise; callers show a dash instead. */
export const MIN_RATED = 5

const round1 = (v: number) => Math.round(v * 10) / 10

/** A set's effort in RIR, or null when never rated. 0 is a rating, not "empty". */
export function rirOf(s: LoggedSet | undefined): number | null {
  if (!s) return null
  if (s.rir != null) return s.rir
  if (s.rpe != null) return 10 - s.rpe
  return null
}

/** RIR → the scale being displayed. */
export function toScale(kind: 'rir' | 'rpe', rir: number | null): number | null {
  return rir == null ? null : round1(kind === 'rpe' ? 10 - rir : rir)
}

function workoutTimestamp(w: WorkoutRecord): number {
  const t = w.startedAt ?? new Date(w.date).getTime()
  return Number.isFinite(t) ? t : 0
}

function inWindow(w: WorkoutRecord, days: number | undefined): boolean {
  return !days || workoutTimestamp(w) > Date.now() - days * 86400000
}

/** Every finished work set in the history, oldest first. */
export function eachDoneSet(history: TrainingHistory, fn: (s: LoggedSet, w: WorkoutRecord, e: WorkoutEntry) => void): void {
  for (const w of history ?? []) {
    for (const e of w.entries ?? []) {
      for (const s of e.sets ?? []) {
        if (isDone(s) && !isWarmupRow(s)) fn(s, w, e)
      }
    }
  }
}

export function avgRir(sets: LoggedSet[]): number | null {
  const vs = (sets ?? []).map(rirOf).filter((v): v is number => v != null)
  return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null
}

export interface EffortSummary {
  done: number
  rated: number
  hard: number
  /** null when fewer than MIN_RATED rated sets — an average needs its denominator. */
  avg: number | null
  hardPct: number | null
}

/**
 * Headline numbers for a window: how hard, how much was hard, and how much of the training
 * was rated at all. Effort is optional, so partial coverage is the normal case.
 */
export function effortSummary(history: TrainingHistory, days?: number): EffortSummary {
  let done = 0, rated = 0, sum = 0, hard = 0
  eachDoneSet(history, (s, w) => {
    if (!inWindow(w, days)) return
    done++
    const r = rirOf(s)
    if (r == null) return
    rated++; sum += r
    if (r <= HARD_RIR) hard++
  })
  return {
    done, rated, hard,
    avg: rated >= MIN_RATED ? sum / rated : null,
    hardPct: rated >= MIN_RATED ? hard / rated : null,
  }
}

/** Does this history hold any rated set at all? Decides whether effort UI exists. */
export function hasEffort(history: TrainingHistory): boolean {
  let any = false
  eachDoneSet(history, s => { if (!any && rirOf(s) != null) any = true })
  return any
}

function mondayOf(isoDate: string): number {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  d.setHours(12, 0, 0, 0)
  return +d
}

export interface EffortWeekPoint {
  t: number
  /** Average RIR among that week's rated sets. */
  rir: number
  ratedSets: number
  totalSets: number
}

/**
 * Average effort per calendar week with the week's set count alongside: volume up with
 * effort up is fatigue accumulating; volume up with effort flat is adaptation.
 * Weeks with a single rated set are dropped rather than drawn.
 */
export function effortWeeks(history: TrainingHistory, days?: number): EffortWeekPoint[] {
  const wk = new Map<string, { t: number; sum: number; n: number; sets: number }>()
  eachDoneSet(history, (s, w) => {
    if (!inWindow(w, days)) return
    const key = w.date.slice(0, 10)
    let e = wk.get(key)
    if (!e) wk.set(key, (e = { t: mondayOf(key), sum: 0, n: 0, sets: 0 }))
    e.sets++
    const r = rirOf(s)
    if (r != null) { e.sum += r; e.n++ }
  })
  return [...wk.values()]
    .filter(e => e.n >= 2)
    .sort((a, b) => a.t - b.t)
    .map(e => ({ t: e.t, rir: round1(e.sum / e.n), ratedSets: e.n, totalSets: e.sets }))
}

export const BUCKETS = 4 // whole-RIR bins 0,1,2,3 plus a "4+" tail

export interface EffortHistogramBin { rir: number; tail: boolean; n: number; pct: number }

/** How rated sets spread across the scale — an average alone hides bimodal effort. */
export function effortHistogram(history: TrainingHistory, days?: number): EffortHistogramBin[] {
  const bins = new Array<number>(BUCKETS + 1).fill(0)
  let rated = 0
  eachDoneSet(history, (s, w) => {
    if (!inWindow(w, days)) return
    const r = rirOf(s)
    if (r == null) return
    rated++
    bins[Math.min(BUCKETS, Math.max(0, Math.floor(r)))]++
  })
  return bins.map((n, i) => ({ rir: i, tail: i === BUCKETS, n, pct: rated ? n / rated : 0 }))
}

/** The filter behind any "hard sets only" view. */
export function isHardSet(s: LoggedSet): boolean {
  const r = rirOf(s)
  return r != null && r <= HARD_RIR
}
