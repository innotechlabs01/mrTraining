import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, getEventDetail, getEventRegistration, getEventFormResponses } from '@/lib/coaching-db';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) {
      return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });
    }

    const detail = await getEventDetail(ctx.params.id);
    if (!detail) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const registration = await getEventRegistration(ctx.params.id, athlete.id);
    const responses = await getEventFormResponses(ctx.params.id, athlete.id);

    return NextResponse.json({
      event: detail.event,
      listItems: detail.listItems,
      formFields: detail.formFields,
      running: detail.running,
      registration,
      responses,
    });
  } catch (error) {
    console.error('Error fetching athlete event detail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
