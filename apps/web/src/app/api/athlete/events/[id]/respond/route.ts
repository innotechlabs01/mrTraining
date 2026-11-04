import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

type RespondBody = {
  status?: string;
  answers?: Array<{ fieldId: string; value: string }>;
};

const VALID_STATUSES = ['accepted', 'cancelled'];

// POST /api/athlete/events/[id]/respond — register/respond to an event (Go API).
export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: RespondBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const answers = (body.answers ?? []).map((a) => ({
      field_id: a.fieldId,
      value: a.value,
    }));

    const result = await goFetchServer<{ registration: unknown }>(
      `/api/v1/athletes/events/${ctx.params.id}/respond`,
      token,
      { method: 'POST', body: JSON.stringify({ status: body.status, answers }) },
    );

    return NextResponse.json({ registration: result.registration }, { status: 201 });
  } catch (error) {
    console.error('Error registering athlete for event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
