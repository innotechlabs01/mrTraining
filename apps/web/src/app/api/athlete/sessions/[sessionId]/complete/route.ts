import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, getWorkoutSession, completeWorkoutSession } from '@/lib/coaching-db';

export async function POST(_req: Request, ctx: { params: { sessionId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) {
      return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });
    }

    const session = await getWorkoutSession(ctx.params.sessionId);
    if (!session || session.athleteId !== athlete.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await completeWorkoutSession(session.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error completing workout session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
