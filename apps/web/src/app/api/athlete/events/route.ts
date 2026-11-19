import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

export const dynamic = 'force-dynamic'

interface GoEvent {
  id: string;
  coach_id: string;
  title: string;
  date: string;
  time: string;
  end_time?: string;
  type: string;
  modality: string;
  location: string;
  description: string;
  status: string;
  format?: string;
  is_public: boolean;
  running_distance_km?: number | null;
  running_pace?: string;
  running_meeting_point?: string;
  athlete_ids: string[];
  form_fields: Array<{ id: string; label: string; kind: string; options: string[]; required: boolean }>;
  list_items: string[];
  created_at: string;
  updated_at: string;
}

interface GoEventsList {
  data: GoEvent[];
  total: number;
  page: number;
  limit: number;
}

// GET /api/athlete/events — events from the athlete's linked coaches (Go API).
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

    const { data } = await goFetchServer<GoEventsList>('/api/v1/events', token);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching athlete events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
