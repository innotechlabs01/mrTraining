import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getAthleteByClerkId,
  getWorkoutDetail,
  getAthleteTrainingHistory,
  type WorkoutExercise,
} from '@/lib/db';
import { nextPrescription, policyFor } from '@/lib/training-engine/progression';
import type { ExerciseConfig, ProgressionPolicy } from '@/lib/training-engine/types';

// GET /api/athlete/workouts/[id]/prescription
// The next target per exercise for this workout, derived from the athlete's logged
// history. Every prescription carries `why` — a suggestion you cannot audit is one you
// stop trusting.
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    // 1. AUTH FIRST
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. RESOLVE ACTOR FROM SESSION
    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });

    // 3. OWNERSHIP (IDOR guard): out-of-scope reads as not found.
    const detail = await getWorkoutDetail(ctx.params.id);
    if (!detail || detail.workout.athleteId !== athlete.id) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const { history } = await getAthleteTrainingHistory(athlete.id);

    const prescriptions = detail.exercises.map((ex: WorkoutExercise) => {
      const cfg: ExerciseConfig = {
        id: ex.libraryExerciseId ?? ex.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        mode: ex.mode,
        phase: ex.phase,
        sets: ex.sets,
        reps: ex.reps,
        repsMin: ex.repsMin,
        repsMax: ex.repsMax,
        prog: ex.prog,
        inc: ex.inc,
        sec: ex.sec,
        minutes: ex.minutes,
        speed: ex.speed,
        perSide: ex.perSide,
        bodyPart: ex.bodyPart,
        muscleGroups: ex.muscleGroups,
        weightKg: ex.weightKg,
      };
      const p = nextPrescription(history, cfg);
      return {
        exerciseId: ex.id,
        name: ex.name,
        mode: ex.mode,
        effectivePolicy: policyFor(cfg, null, ex.mode) as ProgressionPolicy,
        kind: p.kind,
        weightKg: p.weightKg ?? null,
        reps: p.reps ?? null,
        sets: p.sets ?? null,
        sec: p.sec ?? null,
        why: p.why ?? null,
      };
    });

    return NextResponse.json({ workoutId: detail.workout.id, prescriptions }, { status: 200 });
  } catch (error) {
    console.error('Error computing athlete workout prescription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
