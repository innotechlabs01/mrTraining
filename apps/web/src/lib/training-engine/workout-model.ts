// Focused workout semantics shared by progression, effort, and fatigue modules.
// Legacy rows have no explicit phase/mode, so defaults preserve the reps/work shape.
// Clean-room implementation of well-known training-log semantics; no external code.

import type { ExerciseConfig, LoggedSet, SetPhase, WorkoutEntry, ExerciseMode } from './types'

const MODES: ExerciseMode[] = ['reps', 'time', 'cardio']

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)

function normalizePhase(value: unknown, fallback: SetPhase = 'work'): SetPhase {
  const token = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (['warmup', 'warm-up', 'warm_up'].includes(token)) return 'warmup'
  if (token === 'work') return 'work'
  return fallback
}

/** A row's phase. An explicit phase wins over any legacy boolean flag. */
export function phaseForSet(set: LoggedSet | undefined, fallback: SetPhase = 'work'): SetPhase {
  const source = isObject(set) ? set : {}
  if (source.phase != null && source.phase !== '') return normalizePhase(source.phase, fallback)
  // No legacy boolean in our schema; treat anything unrecognised as work.
  return normalizePhase(undefined, fallback)
}

export function isWarmupRow(set: LoggedSet | undefined): boolean {
  return phaseForSet(set) === 'warmup'
}

export function isSkippedRow(set: LoggedSet | undefined): boolean {
  return !!(set && (set.skipped === true || set.skipped === 1))
}

export function isDone(set: LoggedSet | undefined): boolean {
  return !!(set && (set.completed === true || set.completed === 1))
}

export function normalizeMode(value: unknown, fallback: ExerciseMode = 'reps'): ExerciseMode {
  const token = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (MODES.includes(token as ExerciseMode)) return token as ExerciseMode
  return MODES.includes(fallback) ? fallback : 'reps'
}

function modeFromUnit(value: unknown): ExerciseMode | null {
  const token = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (['rep', 'reps', 'repetition', 'repetitions'].includes(token)) return 'reps'
  if (['sec', 'secs', 'second', 'seconds'].includes(token)) return 'time'
  if (['min', 'mins', 'minute', 'minutes'].includes(token)) return 'cardio'
  return null
}

function explicitMode(source: Record<string, unknown>): ExerciseMode | null {
  const token = typeof source.mode === 'string' ? source.mode.trim().toLowerCase() : ''
  if (MODES.includes(token as ExerciseMode)) return token as ExerciseMode
  return modeFromUnit(source.unit)
}

function inferredMode(source: Record<string, unknown>): ExerciseMode | null {
  const explicit = explicitMode(source)
  if (explicit) return explicit
  if (String(source.mode ?? '').trim().toLowerCase() === 'amrap') return 'reps'
  if (source.minutes != null || source.speed != null) return 'cardio'
  if (source.sec != null || source.seconds != null) return 'time'
  if (source.reps != null) return 'reps'
  return null
}

/** Resolve one row's mode: explicit row value, then parent target fields, then row fields. */
export function modeForSet(set: LoggedSet | undefined, target: Partial<ExerciseConfig> = {}): ExerciseMode {
  return (
    explicitMode(isObject(set) ? set : {}) ||
    inferredMode(isObject(target) ? target : {}) ||
    inferredMode(isObject(set) ? set : {}) ||
    'reps'
  )
}

/** One mode for a whole entry; intentionally mixed work-row modes return null. */
export function modeForEntry(entry: WorkoutEntry, fallback: ExerciseMode | null = null): ExerciseMode | null {
  const target = entry.target ?? {}
  const sets = Array.isArray(entry.sets) ? entry.sets : []
  const work = sets.filter(s => !isWarmupRow(s))
  const observed = work.length ? work : sets
  const modes = [...new Set(observed.map(s => modeForSet(s, target)))]
  if (modes.length > 1) return null
  if (modes.length === 1) return modes[0]
  const targetMode = inferredMode(isObject(target) ? target : {})
  if (targetMode) return targetMode
  return fallback == null ? modeForSet(undefined, target) : normalizeMode(fallback)
}
