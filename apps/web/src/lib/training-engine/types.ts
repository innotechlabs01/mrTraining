// Shared types for the training engine. Pure data only — no imports, no I/O.
// Field names mirror the camelCase shapes produced by lib/coaching-db.ts mappers.

export type ExerciseMode = 'reps' | 'time' | 'cardio'
export type SetPhase = 'work' | 'warmup'
export type ProgressionPolicy = 'off' | 'linear' | 'greyskull' | 'double' | 'time'
export type PrescriptionKind = 'first' | 'up' | 'hold' | 'deload' | 'off'
export type FatigueState = 'ready' | 'recovering' | 'fatigued'

/** The prescription for one exercise inside a workout. */
export interface ExerciseConfig {
  id: string
  mode?: ExerciseMode
  phase?: SetPhase
  sets: number
  reps: number
  /** Double-progression range bottom/top. */
  repsMin?: number | null
  repsMax?: number | null
  /** Per-exercise progression override. */
  prog?: ProgressionPolicy | null
  /** Prescribed/default working weight (kg). */
  weightKg?: number | null
  /** Load step override (kg). */
  inc?: number | null
  /** Time-mode target seconds. */
  sec?: number | null
  /** Cardio duration (minutes). */
  minutes?: number | null
  /** Cardio speed. */
  speed?: number | null
  /** Unilateral movement: rep totals step by two. */
  perSide?: boolean
  /** Coarse body part, drives default load steps. */
  bodyPart?: string | null
  /** Primary muscle slugs, drives fatigue mapping. */
  muscleGroups?: string[]
}

/** One logged set row as stored in workout_set_logs. */
export interface LoggedSet {
  completed?: boolean | number
  skipped?: boolean | number
  phase?: SetPhase | null
  weightKg?: number | null
  reps?: number | null
  sec?: number | null
  minutes?: number | null
  speed?: number | null
  rir?: number | null
  rpe?: number | null
}

/** One exercise's logged rows inside a finished or running workout. */
export interface WorkoutEntry {
  id: string
  /** Prescription snapshot recorded with the session; may be absent on legacy rows. */
  target?: Partial<ExerciseConfig>
  sets: LoggedSet[]
}

/** One workout session. History arrays are oldest-first. */
export interface WorkoutRecord {
  date: string
  startedAt?: number
  entries: WorkoutEntry[]
}

export type TrainingHistory = WorkoutRecord[]

/** Why-template plus positional args, e.g. ['Every rep last time — {0} kg more.', 2.5]. */
export type WhyReason = [string, ...unknown[]]

export interface Prescription {
  policy: ProgressionPolicy
  kind: PrescriptionKind
  weightKg?: number
  reps?: number
  sets?: number
  sec?: number
  why?: WhyReason
}
