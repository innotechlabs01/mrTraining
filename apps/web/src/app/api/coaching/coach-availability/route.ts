import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

interface AvailabilitySlot {
  id: string;
  coach_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

export const dynamic = 'force-dynamic';

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

    const availability = await goFetchServer<AvailabilitySlot[]>(
      `/api/v1/coaches/${userId}/availability`,
      token,
    );
    return NextResponse.json(availability);
  } catch (error) {
    console.error('Error fetching coach availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const slots = Array.isArray(body) ? body : (body?.slots ?? []);
    if (!Array.isArray(slots)) {
      return NextResponse.json({ error: 'slots array is required' }, { status: 400 });
    }

    const normalized = slots.map((s: { dayOfWeek?: number; startTime?: string; endTime?: string; isActive?: boolean }) => ({
      day_of_week: Number(s?.dayOfWeek),
      start_time: String(s?.startTime ?? ''),
      end_time: String(s?.endTime ?? ''),
      is_active: s?.isActive ?? true,
    }));

    await goFetchServer(
      `/api/v1/coaches/${userId}/availability`,
      token,
      { method: 'POST', body: JSON.stringify({ slots: normalized }) },
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving coach availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
