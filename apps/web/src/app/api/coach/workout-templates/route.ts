import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listWorkoutTemplates, saveWorkoutTemplate } from '@/lib/db';

// GET /api/coach/workout-templates — the coach's saved builder plans.
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const templates = await listWorkoutTemplates(userId);
    return NextResponse.json({ templates }, { status: 200 });
  } catch (error) {
    console.error('Error listing workout templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const numOrNull = (v: unknown): number | null =>
  v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null;

const normalizeExercise = (ex: unknown) => {
  const e = ex as Record<string, unknown>;
  return {
    name: typeof e.name === 'string' ? e.name : '',
    sets: Number.isFinite(Number(e.sets)) ? Number(e.sets) : 0,
    reps: Number.isFinite(Number(e.reps)) ? Number(e.reps) : 0,
    weightKg: e.weightKg == null ? null : Number.isFinite(Number(e.weightKg)) ? Number(e.weightKg) : null,
    restSeconds: e.restSeconds == null ? null : Number.isFinite(Number(e.restSeconds)) ? Number(e.restSeconds) : null,
    notes: typeof e.notes === 'string' ? e.notes : null,
    sortOrder: Number.isFinite(Number(e.sortOrder)) ? Number(e.sortOrder) : 0,
    muscleGroups: Array.isArray(e.muscleGroups) ? e.muscleGroups.map(String) : [],
    libraryExerciseId: typeof e.libraryExerciseId === 'string' ? e.libraryExerciseId : null,
    mode: typeof e.mode === 'string' ? e.mode : 'reps',
    phase: typeof e.phase === 'string' ? e.phase : 'work',
    supersetGroup: typeof e.supersetGroup === 'string' ? e.supersetGroup : null,
    repsMin: e.repsMin == null ? null : Number.isFinite(Number(e.repsMin)) ? Number(e.repsMin) : null,
    repsMax: e.repsMax == null ? null : Number.isFinite(Number(e.repsMax)) ? Number(e.repsMax) : null,
    prog: typeof e.prog === 'string' ? e.prog : null,
    inc: e.inc == null ? null : Number.isFinite(Number(e.inc)) ? Number(e.inc) : null,
    sec: e.sec == null ? null : Number.isFinite(Number(e.sec)) ? Number(e.sec) : null,
    minutes: e.minutes == null ? null : Number.isFinite(Number(e.minutes)) ? Number(e.minutes) : null,
    speed: e.speed == null ? null : Number.isFinite(Number(e.speed)) ? Number(e.speed) : null,
    perSide: Number.isFinite(Number(e.perSide)) ? Number(e.perSide) : 0,
    bodyPart: typeof e.bodyPart === 'string' ? e.bodyPart : null,
  };
};

// POST /api/coach/workout-templates — save (or update) a builder plan with its exercises.
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const id = await saveWorkoutTemplate(userId, {
      id: typeof body?.id === 'string' ? body.id : undefined,
      name,
      description: typeof body?.description === 'string' ? body.description : '',
      goal: typeof body?.goal === 'string' ? body.goal : '',
      estimatedDurationMinutes: numOrNull(body?.estimatedDurationMinutes),
      exercises: Array.isArray(body?.exercises) ? body.exercises.map(normalizeExercise) : [],
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error('Error saving workout template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
