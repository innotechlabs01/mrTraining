import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, getEventDetail, upsertEventRegistration, replaceEventFormResponses, EventRegistrationStatus } from '@/lib/db';

const VALID_STATUSES: EventRegistrationStatus[] = ['accepted', 'cancelled'];

type RespondBody = {
  status?: string;
  answers?: Array<{ fieldId: string; value: string }>;
};

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) {
      return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });
    }

    let body: RespondBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const detail = await getEventDetail(ctx.params.id);
    if (!detail) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!body.status || !VALID_STATUSES.includes(body.status as EventRegistrationStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    const status = body.status as EventRegistrationStatus;

    const answers = body.answers ?? [];
    if (status === 'accepted' && answers.length > 0) {
      const validFieldIds = new Set<string>((detail.formFields || []).map((f: { id: string }) => f.id));
      const invalid = answers.find(a => !validFieldIds.has(a.fieldId));
      if (invalid) {
        return NextResponse.json({ error: `Unknown form field: ${invalid.fieldId}` }, { status: 400 });
      }
      await replaceEventFormResponses(ctx.params.id, athlete.id, answers);
    }

    const registration = await upsertEventRegistration(ctx.params.id, athlete.id, status);
    return NextResponse.json({ registration }, { status: 201 });
  } catch (error) {
    console.error('Error registering athlete for event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
