import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer, GoApiError } from '@/lib/api/go-client';

interface TimeBlock {
  id: string;
  coach_id: string;
  title: string;
  block_type: string;
  start_time: string;
  end_time: string;
  recurrence: string;
  color: string;
  created_at: string;
  updated_at: string;
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

    const blocks = await goFetchServer<TimeBlock[]>(
      `/api/v1/coaches/${userId}/time-blocks`,
      token,
    );
    return NextResponse.json(blocks);
  } catch (error) {
    if (error instanceof GoApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching time blocks:', error);
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
    const blocks = Array.isArray(body) ? body : (body?.blocks ?? []);
    if (!Array.isArray(blocks)) {
      return NextResponse.json({ error: 'blocks array is required' }, { status: 400 });
    }

    const normalized = blocks.map((b: {
      title?: string; block_type?: string; start_time?: string;
      end_time?: string; recurrence?: string; color?: string;
    }) => ({
      title: String(b?.title ?? ''),
      block_type: String(b?.block_type ?? 'session'),
      start_time: String(b?.start_time ?? ''),
      end_time: String(b?.end_time ?? ''),
      recurrence: String(b?.recurrence ?? 'none'),
      color: String(b?.color ?? ''),
    }));

    await goFetchServer(
      `/api/v1/coaches/${userId}/time-blocks`,
      token,
      { method: 'POST', body: JSON.stringify({ blocks: normalized }) },
    );
    return NextResponse.json({ success: true, data: blocks });
  } catch (error) {
    if (error instanceof GoApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error saving time blocks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
