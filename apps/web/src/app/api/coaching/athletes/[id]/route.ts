import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

export const dynamic = 'force-dynamic'

interface CoachAthlete {
  id: string;
  coach_id: string;
  name: string;
  email: string;
  phone: string;
  sport: string;
  service_type: string;
  plan_name: string;
  plan_price: number;
  plan_billing: string;
  schedule_days: string;
  schedule_time: string;
  start_date: string;
  emergency_contact: string;
  readiness_score: number;
  flag_type: string;
  flag_severity: string;
  flag_message: string;
  created_at: string;
  updated_at: string;
}


export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const athlete = await goFetchServer<CoachAthlete>(
      `/api/v1/coach/athletes/${id}`,
      token,
    );
    if (!athlete) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(athlete);
  } catch (error) {
    console.error('Error fetching athlete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    await goFetchServer(
      `/api/v1/coach/athletes/${id}`,
      token,
      { method: 'PUT', body: JSON.stringify({ ...(body ?? {}), id }) },
    );
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error updating athlete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await goFetchServer(
      `/api/v1/coach/athletes/${id}`,
      token,
      { method: 'DELETE' },
    );
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting athlete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
