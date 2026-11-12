import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

export const dynamic = 'force-dynamic'

interface GoTodayData {
  readiness: unknown;
  todaySessions: unknown[];
  activeWorkouts: unknown[];
}

// GET /api/athlete/today — athlete's today view (sessions + active workouts).
export async function GET() {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = await goFetchServer<GoTodayData>('/api/v1/athletes/today', token);
    return NextResponse.json(today, { status: 200 });
  } catch (error) {
    console.error('Error fetching athlete today data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
