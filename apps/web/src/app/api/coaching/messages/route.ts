import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer, GoApiError } from '@/lib/api/go-client';

interface GoMessageThread {
  id: string;
  coachId: string;
  athleteId: string;
  athleteName: string;
  subject: string;
  lastMessage?: string;
  lastSentAt?: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

// GET /api/coaching/messages — list message threads.
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

    const threads = await goFetchServer<GoMessageThread[]>('/api/v1/messages', token);
    return NextResponse.json(threads, { status: 200 });
  } catch (error) {
    if (error instanceof GoApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching message threads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/coaching/messages — create a message thread.
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

    const created = await goFetchServer<GoMessageThread>('/api/v1/messages', token, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof GoApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error creating message thread:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/coaching/messages — send a message within a thread.
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
    const { threadId } = body as { threadId?: string };
    if (!threadId) {
      return NextResponse.json({ error: 'threadId is required' }, { status: 400 });
    }

    const messageId = await goFetchServer<{ id: string }>(
      `/api/v1/messages/${threadId}/messages`,
      token,
      { method: 'POST', body: JSON.stringify(body) },
    );

    return NextResponse.json({ success: true, id: messageId.id }, { status: 201 });
  } catch (error) {
    if (error instanceof GoApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
