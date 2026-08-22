// Muscle-level fatigue and retained-strength estimates derived from logged volume.
//
// A "normal" hard session for one muscle, in primary-set equivalents: the saturation curve
// 1 - exp(-stimulus / REF) maps any session size onto [0,1) so volume raises the starting
// fatigue level without ever pinning it, and the value then fades asymptotically.
//
// Clean-room implementation of standard stimulus-fatigue decay modeling; no external code.

import type { FatigueState, TrainingHistory, WorkoutEntry } from './types'
import { isWarmupRow, isDone } from './workout-model'

/** Reference session volume (kg of intensity-weighted tonnage) for the saturation curve. */
export const FATIGUE_REF_VOLUME = 2000
/** Scan bound: after 30 days (~20 half-lives) a session contributes below 1e-6. */
export const FATIGUE_SCAN_MS = 30 * 24 * 60 * 60 * 1000
/** Load assumed for bodyweight exercises when nothing is logged. */
export const BODYWEIGHT_REF_LOAD = 75
/** Duration proxy (kg of tonnage per minute) for cardio/timed work. */
export const CARDIO_TONNAGE_PER_MIN = 50
export const FATIGUE_HALF_LIFE_MS = 36 * 60 * 60 * 1000 // 36 h
export const STRENGTH_FULL_MS = 14 * 24 * 60 * 60 * 1000 // full retention period
export const STRENGTH_HALF_LIFE_MS = 28 * 24 * 60 * 60 * 1000
export const STRENGTH_FLOOR = 0.5
/** Strength decays far slower than fatigue, so it needs its own longer scan (~5 half-lives). */
export const STRENGTH_SCAN_MS = STRENGTH_FULL_MS + 6 * STRENGTH_HALF_LIFE_MS

const FATIGUE_THRESHOLDS = { ready: 0.25, fatigued: 0.5 }

export function halfLifeDecay(ageMs: number, halfLifeMs: number): number {
  return Math.pow(0.5, ageMs / halfLifeMs)
}

function workoutTimestamp(w: { date: string; startedAt?: number }): number {
  const t = w.startedAt ?? new Date(w.date).getTime()
  return Number.isFinite(t) ? t : Date.now()
}

/**
 * One set's stimulus in kg-equivalent tonnage. Weighted sets contribute weight × reps;
 * bodyweight sets use a reference load; timed/cardio work uses a per-minute proxy so it
 * still registers on the map without pretending to be tonnage.
 */
export function setStimulusKg(entry: WorkoutEntry, setIndex: number): number {
  const s = entry.sets[setIndex]
  if (!s || !isDone(s) || isWarmupRow(s)) return 0
  const w = Number(s.weightKg ?? entry.target?.weightKg ?? 0)
  const reps = Number(s.reps ?? 0)
  if (w > 0 && reps > 0) return w * reps
  if (w <= 0 && reps > 0) return BODYWEIGHT_REF_LOAD * reps
  const sec = Number(s.sec ?? 0)
  if (sec > 0) return (sec / 60) * CARDIO_TONNAGE_PER_MIN
  const minutes = Number(s.minutes ?? 0)
  if (minutes > 0) return minutes * CARDIO_TONNAGE_PER_MIN
  return 0
}

function musclesOf(entry: WorkoutEntry): string[] {
  const fromTarget = entry.target?.muscleGroups ?? []
  if (fromTarget.length) return fromTarget.map(m => m.trim().toLowerCase()).filter(Boolean)
  // No explicit mapping: fall back to one anonymous bucket so untagged history still counts.
  return ['unmapped']
}

export interface MuscleFatigue {
  muscle: string
  /** 0..1 accumulated fatigue after exponential decay. */
  level: number
  state: FatigueState
  /** Retained strength fraction 0.5..1 after full-retention + decay. */
  strength: number
}

export function classifyFatigue(level: number): FatigueState {
  if (level < FATIGUE_THRESHOLDS.ready) return 'ready'
  if (level <= FATIGUE_THRESHOLDS.fatigued) return 'recovering'
  return 'fatigued'
}

/**
 * Per-muscle fatigue and retained strength over the history window, as of `nowMs`.
 * Each session contributes its saturation-mapped stimulus, decaying by half-life since the
 * workout timestamp. Strength stays at full value through STRENGTH_FULL_MS, then decays to
 * STRENGTH_FLOOR. Untreated muscles do not appear — callers decide how to display absence.
 */
interface MuscleAccum {
  fatigue: number
  lastStimulusAgeMs: number | null
  lastStrengthAgeMs: number | null
}

export function fatigueByMuscle(history: TrainingHistory, nowMs: number = Date.now()): Map<string, MuscleFatigue> {
  const acc = new Map<string, MuscleAccum>()
  const get = (muscle: string): MuscleAccum =>
    acc.get(muscle) ?? { fatigue: 0, lastStimulusAgeMs: null, lastStrengthAgeMs: null }

  // Pass 1 — fatigue: saturation-mapped stimulus decaying with the 36h half-life.
  for (const w of history ?? []) {
    const ageMs = nowMs - workoutTimestamp(w)
    if (ageMs < 0 || ageMs > FATIGUE_SCAN_MS) continue
    const decay = halfLifeDecay(ageMs, FATIGUE_HALF_LIFE_MS)
    for (const entry of w.entries ?? []) {
      let sessionStimulus = 0
      for (let i = 0; i < entry.sets.length; i++) sessionStimulus += setStimulusKg(entry, i)
      if (sessionStimulus <= 0) continue
      for (const muscle of musclesOf(entry)) {
        const cur = get(muscle)
        cur.fatigue = Math.min(1 - 1e-9, cur.fatigue + (1 - Math.exp(-sessionStimulus / FATIGUE_REF_VOLUME)) * decay)
        cur.lastStimulusAgeMs = cur.lastStimulusAgeMs == null ? ageMs : Math.min(cur.lastStimulusAgeMs, ageMs)
        acc.set(muscle, cur)
      }
    }
  }

  // Pass 2 — retained strength: slower decay over its own longer window.
  for (const w of history ?? []) {
    const ageMs = nowMs - workoutTimestamp(w)
    if (ageMs < 0 || ageMs > STRENGTH_SCAN_MS) continue
    for (const entry of w.entries ?? []) {
      let hasWork = false
      for (let i = 0; i < entry.sets.length; i++) { if (setStimulusKg(entry, i) > 0) { hasWork = true; break } }
      if (!hasWork) continue
      for (const muscle of musclesOf(entry)) {
        const cur = get(muscle)
        cur.lastStrengthAgeMs = cur.lastStrengthAgeMs == null ? ageMs : Math.min(cur.lastStrengthAgeMs, ageMs)
        acc.set(muscle, cur)
      }
    }
  }

  const out = new Map<string, MuscleFatigue>()
  for (const [muscle, v] of acc) {
    const strengthAge = v.lastStrengthAgeMs ?? Number.MAX_SAFE_INTEGER
    const strength =
      strengthAge <= STRENGTH_FULL_MS
        ? 1
        : Math.max(STRENGTH_FLOOR, STRENGTH_FLOOR + (1 - STRENGTH_FLOOR) * halfLifeDecay(strengthAge - STRENGTH_FULL_MS, STRENGTH_HALF_LIFE_MS))
    out.set(muscle, { muscle, level: v.fatigue, state: classifyFatigue(v.fatigue), strength })
  }
  return out
}

export interface BalanceRow extends MuscleFatigue {
  /** Relative share of recent volume that went to this muscle (0..1). */
  share: number
}

/**
 * Where did the volume go over the window? Names what has been trained and by how much,
 * so the coach can see what has been neglected. Shares sum to 1 across trained muscles.
 */
export function balanceByMuscle(history: TrainingHistory, days: number, nowMs: number = Date.now()): Map<string, BalanceRow> {
  const cutoff = nowMs - days * 86400000
  const totals = new Map<string, number>()
  let grand = 0
  for (const w of history ?? []) {
    const t = workoutTimestamp(w)
    if (t < cutoff || t > nowMs) continue
    for (const entry of w.entries ?? []) {
      let stimulus = 0
      for (let i = 0; i < entry.sets.length; i++) stimulus += setStimulusKg(entry, i)
      if (stimulus <= 0) continue
      grand += stimulus
      for (const muscle of musclesOf(entry)) {
        totals.set(muscle, (totals.get(muscle) ?? 0) + stimulus)
      }
    }
  }
  const fatigueMap = fatigueByMuscle(history, nowMs)
  const out = new Map<string, BalanceRow>()
  for (const [muscle, stimulus] of totals) {
    const base = fatigueMap.get(muscle)
    out.set(muscle, {
      ...(base ?? { muscle, level: 0, state: classifyFatigue(0), strength: STRENGTH_FLOOR }),
      share: grand > 0 ? stimulus / grand : 0,
    })
  }
  return out
}

/** Muscles referenced anywhere in the plan but absent from the training window. */
export function neglectedMuscles(allPlanMuscles: string[], history: TrainingHistory, days: number, nowMs: number = Date.now()): string[] {
  const trained = balanceByMuscle(history, days, nowMs)
  const wanted = [...new Set(allPlanMuscles.map(m => m.trim().toLowerCase()).filter(Boolean))]
  return wanted.filter(m => !trained.has(m))
}
