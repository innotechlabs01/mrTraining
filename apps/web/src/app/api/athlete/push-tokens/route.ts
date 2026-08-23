import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { registerPushToken } from '@/lib/coaching-db';

// POST /api/athlete/push-tokens — register a push notification token.
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const token = body?.token;
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    const platform = body?.platform ?? 'expo';
    await registerPushToken(userId, token, platform, 'athlete');
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Error registering push token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
