import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

export const dynamic = 'force-dynamic'

interface CoachInviteResponse {
  success: boolean;
  invitationId: string;
  email: string;
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

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Forward to Go API: POST /api/v1/coach/invite (replaces direct SQL via
    // coach-isolation-db: getCoachById + getCoachAthleteCount + createPendingInvite).
    const result = await goFetchServer<CoachInviteResponse>(
      '/api/v1/coach/invite',
      token,
      { method: 'POST', body: JSON.stringify({ email }) },
    );

    return NextResponse.json({ success: true, invitationId: result.invitationId }, { status: 200 });
  } catch (error) {
    console.error('Error inviting athlete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
