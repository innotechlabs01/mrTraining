import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCoachAthletes, getCoachAthleteCount } from '@/lib/coach-isolation-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athletes = await getCoachAthletes(userId);
    const count = await getCoachAthleteCount(userId);

    return NextResponse.json({ athletes, count });
  } catch (error) {
    console.error('Error fetching coach athletes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
