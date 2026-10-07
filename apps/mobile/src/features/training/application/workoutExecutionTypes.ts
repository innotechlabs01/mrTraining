import type { FormMetrics } from '../presentation/components/FormAnalyzer';

export type ExerciseMode = 'reps' | 'time' | 'cardio';

export type Exercise = {
  id: string;
  workoutId: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  restSeconds: number | null;
  sortOrder: number;
  notes: string | null;
  mode?: ExerciseMode;
  phase?: 'work' | 'warmup';
  supersetGroup?: string | null;
  perSide?: boolean;
  sec?: number | null;
  videoUrl?: string | null;
};

export type Workout = {
  id: string;
  contentName: string;
  status: string;
  progress: number;
};

export type WorkoutDetailData = {
  workout: Workout;
  exercises: Exercise[];
};

export type PrescriptionItem = {
  exerciseId: string;
  kind: 'first' | 'up' | 'hold' | 'deload' | 'off';
  weightKg: number | null;
  reps: number | null;
  sec: number | null;
  sets: number | null;
  why: [string, ...unknown[]] | null;
};

export type PrescriptionData = {
  prescriptions: PrescriptionItem[];
};

export type SessionExercise = {
  exerciseId: string;
  name: string;
  pr: { est: number; weightKg: number; reps: number; prevEst: number } | null;
  est1rm: number | null;
};

export type SessionLiveData = {
  session: { id: string } | null;
  exercises: SessionExercise[];
};

export type Advance = 'next-set' | 'next-exercise' | 'done';

export type SetPayload = {
  weightKg?: number;
  reps?: number | undefined;
  sec?: number;
  rir?: number;
};

export type CompletedPr = { name: string; est: number };

export const DEFAULT_FORM_METRICS: FormMetrics = { depth: 0, alignment: 0, tempo: 0 };
export const FORM_SCORE_THRESHOLD = 60;

export function formatWhy(why: PrescriptionItem['why'] | undefined): string | null {
  if (!why || why.length === 0) return null;
  const template = String(why[0]);
  return template.replace(/\{(\d+)\}/g, (_, i) => String(why[Number(i) + 1] ?? ''));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function toNumberOrUndefined(raw: string): number | undefined {
  const n = parseFloat(raw);
  return Number.isNaN(n) ? undefined : n;
}

/** Replace {a}/{b} style placeholders in i18n copy. */
export function interpolate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (acc, [k, v]) => acc.replace(`{${k}}`, v),
    template,
  );
}
