import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer, GoApiError } from '@/lib/api/go-client';

interface GoAthleteProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  sport?: string;
  experienceLevel?: string;
  heightCm: number;
  weightKg: number;
  emergencyContact?: string;
  emergencyPhone?: string;
  modality?: string;
  scheduleDays?: string;
  scheduleTime?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GoAthletesList {
  data: GoAthleteProfile[];
  total: number;
  page: number;
  limit: number;
}

// GET /api/coaching/athletes — the authenticated coach's linked athletes (Go API).
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

    const { data } = await goFetchServer<GoAthletesList>(
      `/api/v1/coaches/${userId}/athletes`,
      token,
    );
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    if (error instanceof GoApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching athletes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/coaching/athletes — create or update an athlete.
export async function POST(req: Request) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const id = (body ?? {}).id as string;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await goFetchServer(
      `/api/v1/coach/athletes/${id}`,
      token,
      { method: 'PUT', body: JSON.stringify({ ...(body ?? {}), id }) },
    );
    return NextResponse.json({ success: true, id });
  } catch (error) {
    if (error instanceof GoApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error creating athlete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
