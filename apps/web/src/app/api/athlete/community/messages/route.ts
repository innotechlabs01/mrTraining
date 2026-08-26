import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCommunityMessages, createCommunityMessage } from '@/lib/coaching-db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const forumId = searchParams.get('forumId');
    if (!forumId) {
      return NextResponse.json({ error: 'forumId is required' }, { status: 400 });
    }

    const messages = await getCommunityMessages(forumId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching community messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.forumId || !body.message) {
      return NextResponse.json({ error: 'forumId and message are required' }, { status: 400 });
    }

    const id = await createCommunityMessage({
      forumId: body.forumId,
      userId,
      userName: body.userName || 'Athlete',
      message: body.message,
    });

    return NextResponse.json({ id });
  } catch (error) {
    console.error('Error creating community message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
