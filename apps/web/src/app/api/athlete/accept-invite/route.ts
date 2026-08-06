import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPendingInviteByToken, acceptPendingInvite, linkCoachAthlete, createAthleteProfile, getUserById, createUser } from '@/lib/coach-isolation-db';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inviteToken } = await req.json();
    if (!inviteToken) {
      return NextResponse.json({ error: 'Invite token is required' }, { status: 400 });
    }

    // Find the pending invite
    const invite = await getPendingInviteByToken(inviteToken);
    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 });
    }

    const inviteData = invite as Record<string, unknown>;
    const coach_id = inviteData.coach_id as string;
    const email = inviteData.email as string;

    // Create user record if not exists
    const existingUser = await getUserById(userId);
    if (!existingUser) {
      await createUser({
        id: userId,
        email,
        name: email,
        role: 'athlete',
      });
    }

    // Create athlete profile if not exists
    const existingProfile = await getUserById(userId);
    if (!existingProfile) {
      await createAthleteProfile({
        id: userId,
        email,
        name: email,
      });
    }

    // Link coach and athlete
    await linkCoachAthlete(coach_id, userId);

    // Mark invitation as accepted
    await acceptPendingInvite(inviteToken);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
