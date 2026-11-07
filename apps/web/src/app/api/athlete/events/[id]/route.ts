import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

interface GoEventDetail {
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
    end_time?: string;
    type: string;
    modality: string;
    location: string;
    description: string;
    status: string;
    format?: string;
    is_public: boolean;
    running_distance_km?: number | null;
    running_pace?: string;
    running_meeting_point?: string;
  };
  list_items: string[];
  form_fields: Array<{ id: string; label: string; kind: string; options: string[]; required: boolean }>;
  running: unknown;
  registration: unknown;
  responses: Array<{ id: string; field_id: string; value: string }>;
}

// GET /api/athlete/events/[id] — event detail + athlete registration/responses (Go API).
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detail = await goFetchServer<GoEventDetail>(
      `/api/v1/athletes/events/${ctx.params.id}`,
      token,
    );

    return NextResponse.json({
      event: detail.event,
      listItems: detail.list_items,
      formFields: detail.form_fields,
      running: detail.running,
      registration: detail.registration,
      responses: detail.responses,
    });
  } catch (error) {
    console.error('Error fetching athlete event detail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
