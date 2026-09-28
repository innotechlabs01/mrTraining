import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // TODO: Implement dashboard data fetch from DB
    return NextResponse.json({
      totalAthletes: 0,
      activeWorkouts: 0,
      completionRate: 0,
      upcomingSessions: 0,
      revenueThisMonth: 0,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}