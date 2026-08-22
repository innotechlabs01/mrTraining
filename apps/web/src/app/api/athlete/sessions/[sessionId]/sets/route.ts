import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, getWorkoutSession, logWorkoutSet } from '@/lib/coaching-db';

export async function POST(req: Request, ctx: { params: { sessionId: string } }) {
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

    const body = await req.json();
    const exerciseId = body?.exerciseId;
    const setIndex = body?.setIndex;
    if (!exerciseId || setIndex === undefined || setIndex === null) {
      return NextResponse.json({ error: 'exerciseId and setIndex are required' }, { status: 400 });
    }

    const set = await logWorkoutSet(
      session.id,
      exerciseId,
      setIndex,
      body?.weightKg ?? null,
      body?.reps ?? null,
    );
    return NextResponse.json({ set }, { status: 201 });
  } catch (error) {
    console.error('Error logging workout set:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
