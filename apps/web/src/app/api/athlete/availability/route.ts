import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

export const dynamic = 'force-dynamic'

interface CurrentUser {
  user?: {
    role?: string;
  };
}

interface AvailabilityResponse {
  availability: { id: string; coach_id: string; day_of_week: number; start_time: string; end_time: string; is_active: boolean; created_at: string }[];
}


export async function GET(req: Request) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Confirm the caller is an athlete via /users/me
    const me = await goFetchServer<CurrentUser>(
      `/api/v1/users/me`,
      token,
    );
    if (me.user?.role !== 'athlete') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // "My coach" availability: coachId is passed by the frontend.
    // If not provided yet, return empty (frontend must pass coachId).
    const { searchParams } = new URL(req.url);
    const coachId = searchParams.get('coachId');
    if (!coachId) {
      return NextResponse.json({ availability: [] });
    }

    const data = await goFetchServer<AvailabilityResponse>(
      `/api/v1/athlete/availability?coachId=${encodeURIComponent(coachId)}`,
      token,
    );
    return NextResponse.json({ availability: data?.availability ?? [] });
  } catch (error) {
    console.error('Error fetching coach availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
