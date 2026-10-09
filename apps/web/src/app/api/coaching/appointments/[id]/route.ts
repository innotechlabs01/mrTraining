import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteAppointment, updateAppointment } from '@/lib/db';

export const dynamic = 'force-dynamic';

type UpdatableFields = Partial<{
  status: string;
  notes?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}>;

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = (await req.json()) ?? {};
    const { id: _ignored, ...fields } = body as { id?: string } & UpdatableFields;

    const existing = await getAthleteAppointment(params.id);
    if (!existing || existing.coachId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await updateAppointment(params.id, fields);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
