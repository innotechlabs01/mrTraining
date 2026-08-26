import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getAthleteByClerkId,
  getWorkoutDetail,
  getActiveWorkoutSession,
  createWorkoutSession,
  listSessionSetLogs,
  getAthleteTrainingHistory,
} from '@/lib/db';
import { bestSetOf, is1RMRecord, best1RM } from '@/lib/training-engine/onerm';
import type { WorkoutEntry } from '@/lib/training-engine/types';

// GET /api/athlete/workouts/[id]/session
// The athlete's active session for this workout (if any) with its logged sets, plus
// live PR detection and estimated 1RM per exercise against prior history.
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });

    const detail = await getWorkoutDetail(ctx.params.id);
    if (!detail || detail.workout.athleteId !== athlete.id) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const session = await getActiveWorkoutSession(detail.workout.id, athlete.id);
    if (!session) return NextResponse.json({ session: null, exercises: [] }, { status: 200 });

    const [logs, { history }] = await Promise.all([
      listSessionSetLogs(session.id),
      getAthleteTrainingHistory(athlete.id),
    ]);

    const exercises = detail.exercises.map(ex => {
      const key = ex.libraryExerciseId ?? ex.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const entry: WorkoutEntry = {
        id: key,
        target: {
          sets: ex.sets, reps: ex.reps, sec: ex.sec, weightKg: ex.weightKg,
          mode: ex.mode, muscleGroups: ex.muscleGroups, bodyPart: ex.bodyPart,
        },
        sets: logs.filter(l => l.exerciseId === ex.id).map(l => ({
          completed: l.completed, skipped: l.skipped ? 1 : 0, phase: l.phase ?? null,
          weightKg: l.weightKg, reps: l.reps, sec: l.sec, minutes: l.minutes,
          speed: l.speed, rir: l.rir ?? null, rpe: l.rpe ?? null,
        })),
      };
      const record = is1RMRecord(history, key, entry);
      const prior = best1RM(history, key);
      return {
        exerciseId: ex.id,
        name: ex.name,
        mode: ex.mode,
        prescribed: { sets: ex.sets, reps: ex.reps, sec: ex.sec, weightKg: ex.weightKg, restSeconds: ex.restSeconds },
        supersetGroup: ex.supersetGroup,
        phase: ex.phase,
        perSide: ex.perSide,
        sets: logs.filter(l => l.exerciseId === ex.id).map(l => ({
          setIndex: l.setIndex, weightKg: l.weightKg, reps: l.reps, sec: l.sec,
          rir: l.rir ?? null, rpe: l.rpe ?? null, phase: l.phase ?? null, completed: l.completed,
        })),
        est1rm: bestSetOf(entry)?.est ?? null,
        pr: record ? { est: record.est, weightKg: record.weightKg, reps: record.reps, prevEst: record.prev } : null,
        priorBest1rm: prior?.est ?? null,
      };
    });

    return NextResponse.json({ session, exercises }, { status: 200 });
  } catch (error) {
    console.error('Error fetching athlete workout session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) {
      return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });
    }

    // Enforce ownership: the workout must belong to the athlete who started the session.
    // Prevents IDOR — a caller cannot start a session (or later complete it) on a workout they don't own.
    const detail = await getWorkoutDetail(ctx.params.id);
    if (!detail || detail.workout.athleteId !== athlete.id) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    let text: string;
    try {
      text = await req.text();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (text && text.trim()) {
      try {
        JSON.parse(text);
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
    }

    const existing = await getActiveWorkoutSession(ctx.params.id, athlete.id);
    if (existing) {
      return NextResponse.json({ session: existing }, { status: 200 });
    }

    const session = await createWorkoutSession(ctx.params.id, athlete.id);
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Error creating athlete workout session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
