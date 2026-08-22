import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, deactivateHealthDevice } from '@/lib/coaching-db';

// DELETE /api/athlete/health/devices/[id] — disconnect a wearable (ownership-checked).
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });

    const removed = await deactivateHealthDevice(athlete.id, ctx.params.id);
    if (!removed) {
      // Out-of-scope or already inactive reads as not found.
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Error removing health device:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
