import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

export const dynamic = 'force-dynamic'

interface GoWorkout {
  id: string;
  athleteId: string;
  coachId: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface GoWorkoutsList {
  data: GoWorkout[];
  total: number;
  page: number;
  limit: number;
}

// GET /api/athlete/workouts — athlete's assigned workouts (Go API).
export async function GET(req: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data } = await goFetchServer<GoWorkoutsList>('/api/v1/workouts', token);
    return NextResponse.json({ workouts: data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching athlete workouts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
