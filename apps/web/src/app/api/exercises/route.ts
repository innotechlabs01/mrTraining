import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listExerciseLibrary, createCustomExercise } from '@/lib/db';

// GET /api/exercises — the real exercise library: global rows plus this coach's customs.
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const exercises = await listExerciseLibrary(userId);
    return NextResponse.json({ exercises }, { status: 200 });
  } catch (error) {
    console.error('Error listing exercise library:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/exercises — create a coach-scoped custom exercise.
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const created = await createCustomExercise(userId, {
      name,
      description: typeof body?.description === 'string' ? body.description : '',
      mode: ['reps', 'time', 'cardio'].includes(body?.mode) ? body.mode : 'reps',
      bodyPart: body?.bodyPart ?? undefined,
      muscleGroups: Array.isArray(body?.muscleGroups) ? body.muscleGroups : [],
      equipment: body?.equipment ?? undefined,
      difficulty: body?.difficulty ?? undefined,
      category: body?.category ?? undefined,
      instructions: Array.isArray(body?.instructions) ? body.instructions : [],
    });
    return NextResponse.json({ exercise: created }, { status: 201 });
  } catch (error) {
    console.error('Error creating custom exercise:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
