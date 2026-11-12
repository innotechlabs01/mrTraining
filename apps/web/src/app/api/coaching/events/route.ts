import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

interface GoEvent {
  id: string;
  coachId: string;
  title: string;
  description?: string;
  eventDate: string;
  location?: string;
  capacity?: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface GoEventsList {
  data: GoEvent[];
  total: number;
  page: number;
  limit: number;
}

// GET /api/coaching/events — list the coach's events.
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

    const { data } = await goFetchServer<GoEventsList>('/api/v1/events', token);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/coaching/events — create an event.
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

    const created = await goFetchServer<GoEvent>('/api/v1/events', token, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
