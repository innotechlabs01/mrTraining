import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, getWorkoutDetail } from '@/lib/coaching-db';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) {
      return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });
    }

    const detail = await getWorkoutDetail(ctx.params.id);
    if (!detail) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    if (detail.workout.athleteId !== athlete.id) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    console.error('Error fetching athlete workout detail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
