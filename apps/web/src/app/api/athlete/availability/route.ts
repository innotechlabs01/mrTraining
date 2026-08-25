import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, getCoachAvailabilityForAthlete } from '@/lib/coaching-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) {
      return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });
    }

    if (!athlete.coachId) {
      return NextResponse.json({ availability: [] });
    }

    const availability = await getCoachAvailabilityForAthlete(athlete.coachId);
    return NextResponse.json({ availability });
  } catch (error) {
    console.error('Error fetching coach availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
