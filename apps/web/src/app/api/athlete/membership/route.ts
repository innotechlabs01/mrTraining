import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, getAthleteMembership } from '@/lib/coaching-db';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) {
      // New athlete — no membership yet, that's OK
      return NextResponse.json({ status: 'no_membership' });
    }

    const membership = await getAthleteMembership(athlete.id);

    if (!membership) {
      return NextResponse.json({ status: 'no_membership' });
    }

    return NextResponse.json({
      id: membership.id,
      status: membership.status,
      planName: membership.planName,
      planPrice: membership.planPrice,
      paymentDueDate: membership.paymentDueDate,
      currentPeriodEnd: membership.currentPeriodEnd,
      athleteId: membership.athleteId,
      coachId: membership.coachId,
    });
  } catch (error) {
    console.error('Error fetching athlete membership:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
