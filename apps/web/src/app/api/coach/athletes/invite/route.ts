import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCoachById, getCoachAthleteCount, createPendingInvite } from '@/lib/coach-isolation-db';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Verify coach exists and check athlete limit
    const coach = await getCoachById(userId);
    if (!coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    const currentCount = await getCoachAthleteCount(userId);
    if (currentCount >= (coach.max_athletes as number)) {
      return NextResponse.json({ error: 'Max athletes reached' }, { status: 400 });
    }

    // Create Clerk invitation using REST API
    const response = await fetch(
      `${process.env.CLERK_API_URL || 'https://api.clerk.com/v1'}/invitations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
        body: JSON.stringify({
          email_address: email,
          redirect_url: 'mrtraining://invite',
          metadata: JSON.stringify({ coachId: userId }),
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Clerk invitation error:', errorData);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    const invitation = await response.json();

    // Save pending invite
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await createPendingInvite({
      id: invitation.id,
      coach_id: userId,
      email,
      clerk_invitation_id: invitation.id,
      expires_at: expiresAt.toISOString(),
    });

    return NextResponse.json({ success: true, invitationId: invitation.id });
  } catch (error) {
    console.error('Error inviting athlete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
