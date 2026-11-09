import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

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

// GET /api/coach/athletes — the authenticated coach's linked athletes (Go API).
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

    const { data, total } = await goFetchServer<GoAthletesList>(
      `/api/v1/coaches/${userId}/athletes`,
      token,
    );
    return NextResponse.json({ athletes: data, count: total }, { status: 200, headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } });
  } catch (error) {
    console.error('Error fetching coach athletes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
