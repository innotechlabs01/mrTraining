import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, getWorkoutSession, updateWorkoutSessionProgress } from '@/lib/db';

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
    const currentExerciseIndex = body?.currentExerciseIndex;
    const durationSeconds = body?.durationSeconds;
    if (currentExerciseIndex === undefined || currentExerciseIndex === null ||
        durationSeconds === undefined || durationSeconds === null) {
      return NextResponse.json({ error: 'currentExerciseIndex and durationSeconds are required' }, { status: 400 });
    }

    await updateWorkoutSessionProgress(session.id, currentExerciseIndex, durationSeconds);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error updating workout session progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
