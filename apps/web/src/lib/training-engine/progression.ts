// Automatic progression.
//
// Everything here is a pure function of the workout history. Nothing writes back into a
// finished workout: the log is what happened, and the next prescription is *derived* from it
// every time it is needed — so fixing a mistyped set immediately produces the right next
// target, with no stored counters to drift.
//
// Reading a session honestly is the whole game:
//   · a set checked off with at least its target reps  -> hit
//   · a set checked off with fewer reps                -> miss (you logged what you got)
//   · a set never checked off, or skipped              -> miss
//   · fewer sets than prescribed                       -> miss
// So a session that fell apart can never advance the load as though it had succeeded.
//
// Clean-room implementation of well-known strength-training programming rules
// (linear progression, Greyskull LP, double progression); no external code.

import type {
  ExerciseConfig, LoggedSet, Prescription, ProgressionPolicy,
  TrainingHistory, WorkoutEntry, ExerciseMode,
} from './types'
import { modeForEntry, modeForSet, isWarmupRow, isDone, isSkippedRow } from './workout-model'

export const POLICIES: ProgressionPolicy[] = ['off', 'linear', 'greyskull', 'double', 'time']

/** Which policies can sensibly drive which logging mode. */
export const POLICIES_FOR: Record<ExerciseMode, ProgressionPolicy[]> = {
  reps: ['off', 'linear', 'greyskull', 'double'],
  time: ['off', 'time'],
  cardio: ['off'],
}

/** Sessions of repeated misses before a deload. Greyskull resets on the first failure by design. */
export const DELOAD_AFTER: Record<string, number> = { linear: 3, greyskull: 1, double: 3, time: 3 }
const DELOAD_FACTOR = 0.9

const HEAVY_BODY_PARTS = ['upper legs', 'lower legs', 'back', 'hips', 'glutes', 'legs']

/** Default load step; lower-body lifts take the bigger jump. */
export function defaultIncrement(bodyPart: string | null | undefined, unit: 'kg' | 'lb' = 'kg'): number {
  const heavy = !!bodyPart && HEAVY_BODY_PARTS.includes(bodyPart.trim().toLowerCase())
  if (unit === 'lb') return heavy ? 10 : 5
  return heavy ? 5 : 2.5
}

export const DEFAULT_SEC_INCREMENT = 5
/** Past this many sets, more push-ups stop being progress — load or a harder variation instead. */
export const MAX_BW_SETS = 6

/**
 * The policy in force for one exercise: its own override, else the routine default,
 * else the mode's default (reps keeps behaving classically: all reps -> add a step).
 */
export function policyFor(
  cfg: ExerciseConfig,
  routinePolicy?: ProgressionPolicy | null,
  mode?: ExerciseMode,
): ProgressionPolicy {
  const m = mode || modeForEntry({ id: cfg.id, sets: [] }, cfg.mode ?? 'reps') as ExerciseMode
  const allowed = POLICIES_FOR[m] ?? ['off']
  const pick = cfg.prog || routinePolicy || (m === 'reps' ? 'linear' : 'off')
  return allowed.includes(pick) ? pick : 'off'
}

const round1 = (v: number) => Math.round(v * 10) / 10
function snap(v: number, step: number): number {
  if (!(step > 0)) return round1(v)
  return round1(Math.round(v / step) * step)
}

/** Back off ~10% landing on something loadable; a deload that didn't reduce takes one step down. */
function deloadTo(cur: number, step: number): number {
  let next = snap(cur * DELOAD_FACTOR, step)
  if (next >= cur) next = snap(cur - step, step)
  return Math.max(step, next)
}

/** Unilateral totals step by two so both sides get the rep. */
export function repStep(cfg: ExerciseConfig): number {
  return cfg.perSide ? 2 : 1
}

export interface SessionRead {
  mode: ExerciseMode
  goal: number
  weightKg: number
  /** reps-mode fields */
  reps?: number[]
  count?: number
  low?: number
  amrap?: number // Greyskull's final set to failure
  /** time-mode fields */
  held?: number[]
  bestSec?: number
  ok: boolean
}

/**
 * Reduce one finished workout entry to what a policy needs to judge it.
 *
 * Entries without their own target (legacy rows) are judged against `fallback`, the
 * exercise's current plan — otherwise every past session would score as a miss and a
 * long-standing athlete would be greeted with an unearned deload.
 */
export function readSession(entry: WorkoutEntry, fallback?: Partial<ExerciseConfig>): SessionRead {
  const target = (entry.target && Object.keys(entry.target).length ? entry.target : fallback) ?? {}
  const mode = modeForSet(undefined, target)
  const sets = (entry.sets ?? []).filter(s => !isWarmupRow(s))
  const planned = (target as Partial<ExerciseConfig>).sets ?? sets.length
  const enough = sets.length >= planned

  if (mode === 'time') {
    const goal = (target.sec as number) ?? 0
    // Unchecked or skipped rows contribute a 0 hold — they are misses, never silent absences.
    const held = sets.map(s => (isDone(s) && !isSkippedRow(s) ? s.sec ?? 0 : 0))
    return {
      mode, goal,
      held,
      bestSec: held.length ? Math.max(...held) : 0,
      weightKg: Math.max(0, ...sets.filter(isDone).map(s => s.weightKg ?? 0)),
      ok: goal > 0 && enough && held.length > 0 && held.every(h => h >= goal),
    }
  }

  const goal = (target.reps as number) ?? 0
  const reps = sets.map(s => (isDone(s) && !isSkippedRow(s) ? s.reps ?? 0 : 0))
  return {
    mode, goal,
    reps,
    count: reps.length,
    low: reps.length ? Math.min(...reps) : 0,
    amrap: reps.length ? reps[reps.length - 1] : 0,
    weightKg: Math.max(0, ...sets.filter(isDone).map(s => s.weightKg ?? 0)),
    ok: goal > 0 && enough && reps.length > 0 && reps.every(r => r >= goal),
  }
}

/** Every past session for one exercise, oldest first. */
export function sessionsFor(history: TrainingHistory, exerciseId: string, fallback?: Partial<ExerciseConfig>): Array<SessionRead & { d: string }> {
  const out: Array<SessionRead & { d: string }> = []
  for (const w of history ?? []) {
    const entry = (w.entries ?? []).find(e => e.id === exerciseId)
    if (entry && entry.sets.some(s => isDone(s) && !isWarmupRow(s))) {
      out.push({ d: w.date, ...readSession(entry, fallback) })
    }
  }
  return out
}

/** How many sessions in a row ended in a miss, counting back from the most recent. */
export function stallCount(sessions: SessionRead[]): number {
  let n = 0
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].ok) break
    n++
  }
  return n
}

/**
 * The next prescription for one exercise. `kind` is one of first|up|hold|deload|off and
 * `why` always answers "why this number?" — a suggestion you can't audit is one you stop
 * trusting. Fields the policy has no opinion on come back undefined.
 */
export function nextPrescription(
  history: TrainingHistory,
  cfg: ExerciseConfig,
  routinePolicy?: ProgressionPolicy | null,
): Prescription {
  const mode = modeForEntry({ id: cfg.id, sets: [], target: cfg }, cfg.mode ?? 'reps') as ExerciseMode
  const policy = policyFor(cfg, routinePolicy, mode)
  const inc = (cfg.inc != null && cfg.inc > 0) ? cfg.inc : defaultIncrement(cfg.bodyPart)
  if (policy === 'off') return { policy, kind: 'off' }

  const sessions = sessionsFor(history, cfg.id, cfg).filter(s => s.mode === mode)
  const last = sessions[sessions.length - 1]
  if (!last) return { policy, kind: 'first', why: ['Nothing logged yet — this session sets the baseline.'] }

  const stalls = stallCount(sessions)
  const deloadAt = DELOAD_AFTER[policy] ?? 3

  if (mode === 'time') {
    if (last.ok) {
      const sec = (last.goal || cfg.sec || 0) + DEFAULT_SEC_INCREMENT
      return { policy, kind: 'up', sec, why: ['Held every set for the full time — target up by {0}s.', DEFAULT_SEC_INCREMENT] }
    }
    if (stalls >= deloadAt) {
      const sec = deloadTo(last.goal || cfg.sec || 0, 5)
      return { policy, kind: 'deload', sec, why: ['Short {0}s holds in a row — back off to {1}s and build up again.', stalls, sec] }
    }
    return { policy, kind: 'hold', sec: last.goal || cfg.sec || undefined, why: ['Last time came up short — same target again.'] }
  }

  const w = last.weightKg
  // Bodyweight work carries no external load, so there is nothing to add or take away —
  // "deload your push-ups to 2.5 kg" is not advice. Progress in reps instead. The trigger is
  // the *logged* weight: a dip done with a belt has a load and belongs on the normal policies.
  if (w <= 0) {
    const goal = last.goal || cfg.reps || 0
    if (!last.ok || goal <= 0) {
      return { policy, kind: 'hold', weightKg: 0, reps: goal || undefined, why: ['Bodyweight — same target again until every set is clean.'] }
    }
    const top = cfg.repsMax && cfg.repsMax > 0 ? cfg.repsMax : 0
    if (top > 0 && goal >= top) {
      const sets = Math.max(1, cfg.sets || last.count || 1) + 1
      const bottom = Math.max(1, Math.min(cfg.reps || top, top))
      if (sets <= MAX_BW_SETS) {
        return { policy, kind: 'up', weightKg: 0, reps: bottom, sets, why: ['{0} reps in every set — add a set and go back to {1}.', goal, bottom] }
      }
      return { policy, kind: 'hold', weightKg: 0, reps: goal, why: ['{0} sets of {1} — time to add weight or move to a harder variation.', sets - 1, goal] }
    }
    const next = goal + repStep(cfg)
    return { policy, kind: 'up', weightKg: 0, reps: next, why: ['Bodyweight — every rep last time, so go for {0} this time.', next] }
  }

  if (policy === 'double') {
    const top = cfg.reps || last.goal || 10
    const bottom = Math.min(cfg.repsMin ?? Math.max(1, top - 2), top)
    if (last.ok) {
      return { policy, kind: 'up', weightKg: snap(w + inc, inc), reps: bottom, why: ['Top of the rep range in every set — {0} kg more, back to {1} reps.', inc, bottom] }
    }
    if (stalls >= deloadAt) {
      const dw = deloadTo(w, inc)
      return { policy, kind: 'deload', weightKg: dw, reps: bottom, why: ['Stalled {0} sessions — deload to {1} kg.', stalls, dw] }
    }
    const aim = Math.min(top, Math.max(bottom, (last.low ?? 0) + repStep(cfg)))
    return { policy, kind: 'hold', weightKg: w, reps: aim, why: ['Same weight — aim for {0} reps this time.', aim] }
  }

  // linear + greyskull
  if (last.ok) {
    // Greyskull's final set is taken to failure: double the target there and you earned a double jump.
    const dbl = policy === 'greyskull' && last.goal > 0 && (last.amrap ?? 0) >= last.goal * 2
    const step = dbl ? inc * 2 : inc
    return {
      policy, kind: 'up', weightKg: snap(w + step, inc),
      why: dbl
        ? ['Last set hit {0} reps — twice the target, so take a double jump of {1} kg.', last.amrap ?? 0, step]
        : ['Every rep last time — {0} kg more.', step],
    }
  }
  if (stalls >= deloadAt) {
    const dw = deloadTo(w, inc)
    return {
      policy, kind: 'deload', weightKg: dw,
      why: stalls > 1
        ? ['Missed reps {0} sessions running — reset to {1} kg and work back up.', stalls, dw]
        : ['Missed reps — reset to {0} kg and work back up.', dw],
    }
  }
  return {
    policy, kind: 'hold', weightKg: w,
    why: ['Missed reps last time — same weight again ({0} of {1} to go).', deloadAt - stalls, deloadAt],
  }
}

/**
 * Apply a prescription to freshly built sets. Only the fields the policy actually decided
 * are touched, and only on sets that have not been logged yet. Warm-up rows are never
 * rewritten: the prescription speaks to work rows only.
 */
export function applyPrescription(sets: LoggedSet[], p: Prescription | null | undefined): LoggedSet[] {
  if (!p || p.kind === 'off' || p.kind === 'first') return sets
  const out = sets.map(s => {
    if (isDone(s) || isWarmupRow(s)) return s
    const o: LoggedSet = { ...s }
    if (p.weightKg != null) o.weightKg = p.weightKg
    if (p.reps != null) o.reps = p.reps
    if (p.sec != null) o.sec = p.sec
    return o
  })
  const workRows = out.filter(s => !isWarmupRow(s))
  if (p.sets != null && p.sets > workRows.length) {
    if (!workRows.length) return out
    const seed = workRows[workRows.length - 1]
    while (out.filter(s => !isWarmupRow(s)).length < p.sets) out.push({ ...seed, completed: false })
  }
  return out
}
