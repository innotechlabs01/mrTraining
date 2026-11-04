import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

interface Appointment {
  id: string;
  coach_id: string;
  athlete_id: string;
  athlete_name: string;
  title: string;
  status: string;
  start_time: string;
  end_time: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

type UpdatableFields = Partial<{
  status: string;
  notes?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}>;

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

    const appointments = await goFetchServer<Appointment[]>(
      `/api/v1/coaches/${userId}/appointments`,
      token,
    );
    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
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
    const { id, ...fields } = (body ?? {}) as { id?: string } & UpdatableFields;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await goFetchServer(
      `/api/v1/coaches/appointments/${id}`,
      token,
      { method: 'PUT', body: JSON.stringify(fields) },
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
