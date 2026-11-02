import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, getAthleteSessions, getAthleteAssignedWorkouts } from '@/lib/db';

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

    // Get today's sessions
    const sessions = await getAthleteSessions(athlete.id);
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter((s: { time: string | undefined }) => s.time?.startsWith(today));

    // Get active workouts
    const workouts = await getAthleteAssignedWorkouts(athlete.id);
    const activeWorkouts = workouts.filter((w: { status: string }) => w.status === 'active' || w.status === 'in_progress');

    return NextResponse.json({
      athlete: {
        id: athlete.id,
        name: athlete.name,
        sport: athlete.sport,
      },
      readiness: athlete.readiness,
      todaySessions,
      activeWorkouts,
    });
  } catch (error) {
    console.error('Error fetching athlete today data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
