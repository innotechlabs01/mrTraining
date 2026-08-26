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
      exercises: Array.isArray(body?.exercises) ? body.exercises : [],
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error('Error saving workout template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
