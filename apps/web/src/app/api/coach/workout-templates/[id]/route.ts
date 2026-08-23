import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getWorkoutTemplate, deleteWorkoutTemplate } from '@/lib/coaching-db';

// GET /api/coach/workout-templates/[id] — full template with exercises (ownership-checked).
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const template = await getWorkoutTemplate(userId, ctx.params.id);
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    return NextResponse.json({ template }, { status: 200 });
  } catch (error) {
    console.error('Error reading workout template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/coach/workout-templates/[id]
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const removed = await deleteWorkoutTemplate(userId, ctx.params.id);
    if (!removed) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting workout template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
