import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, getActiveWorkoutSession, createWorkoutSession } from '@/lib/coaching-db';

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) {
      return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });
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
