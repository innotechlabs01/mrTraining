import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { getToken } = await auth();
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    // Save onboarding via Go API (POST /api/v1/athletes/onboard). Replaces the
    // direct SQL user/athlete_profile/coach_athletes/athlete_memberships
    // creation via coach-isolation-db. Account provisioning is handled by the
    // Clerk webhook and accept-invite flow; this endpoint persists the
    // athlete's onboarding preferences.
    await goFetchServer(`/api/v1/athletes/onboard`, token, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error onboarding athlete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
