import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCoachAppointments, getAthleteAppointment, updateAppointment } from '@/lib/db';

export const dynamic = 'force-dynamic';

type UpdatableFields = Partial<{
  status: string;
  notes?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}>;

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const appointments = await getCoachAppointments(userId);
    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const { id, ...fields } = (body ?? {}) as { id?: string } & UpdatableFields;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const existing = await getAthleteAppointment(String(id));
    if (!existing || existing.coachId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await updateAppointment(String(id), fields);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
