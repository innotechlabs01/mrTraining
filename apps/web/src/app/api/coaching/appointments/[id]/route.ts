import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

type UpdatableFields = Partial<{
  status: string;
  notes?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}>;

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) ?? {};
    const { id: _ignored, ...fields } = body as { id?: string } & UpdatableFields;

    await goFetchServer(
      `/api/v1/coaches/appointments/${params.id}`,
      token,
      { method: 'PUT', body: JSON.stringify(fields) },
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
