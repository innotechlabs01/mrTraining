import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMessageThreads, createThread, saveMessage } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const threads = await getMessageThreads(userId);
    return NextResponse.json(threads);
  } catch (error) {
    console.error('Error fetching message threads:', error);
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
    const threadId = await createThread(userId, body ?? {});
    return NextResponse.json({ success: true, id: threadId });
  } catch (error) {
    console.error('Error creating message thread:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const { threadId } = (body ?? {}) as { threadId?: string };
    if (!threadId) {
      return NextResponse.json({ error: 'threadId is required' }, { status: 400 });
    }
    const messageId = await saveMessage(userId, threadId, body);
    return NextResponse.json({ success: true, id: messageId });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
