import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

export const dynamic = 'force-dynamic';

interface AllySummary {
  relationship_id: string;
  coach_id: string;
  ally_id: string;
  legal_name: string;
  commercial_name: string;
  category: string;
  status: string;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { getToken } = await auth();
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Replaces direct SQL via coach-isolation-db: GET /api/v1/athlete/allies
    // returns the allies of the coach linked to the authenticated athlete.
    const result = await goFetchServer<{ data: AllySummary[] }>(
      `/api/v1/athlete/allies`,
      token,
    );

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error fetching athlete allies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
