import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, getWorkoutDetail, getActiveWorkoutSession, createWorkoutSession } from '@/lib/coaching-db';

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
