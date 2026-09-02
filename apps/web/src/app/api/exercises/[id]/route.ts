import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateExerciseLibrary, deleteExerciseLibrary } from '@/lib/db';

// PUT /api/exercises/:id — update an existing library exercise (incl. videoUrl / imageUrl).
export async function PUT(req: Request, ctx: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const updated = await updateExerciseLibrary(ctx.params.id, {
      name: body?.name,
      description: body?.description,
      mode: body?.mode,
      bodyPart: body?.bodyPart,
      muscleGroups: body?.muscleGroups,
      equipment: body?.equipment,
      difficulty: body?.difficulty,
      category: body?.category,
      instructions: body?.instructions,
      defaultSec: body?.defaultSec,
      videoUrl: body?.videoUrl ?? null,
      imageUrl: body?.imageUrl ?? null,
    });

    if (!updated) return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    return NextResponse.json({ exercise: updated }, { status: 200 });
  } catch (error) {
    console.error('Error updating exercise:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/exercises/:id — delete an existing library exercise.
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const deleted = await deleteExerciseLibrary(ctx.params.id);
    if (!deleted) return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting exercise:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}