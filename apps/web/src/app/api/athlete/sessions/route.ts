import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, getAthleteSessions } from '@/lib/coaching-db';

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

    const sessions = await getAthleteSessions(athlete.id);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching athlete sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
