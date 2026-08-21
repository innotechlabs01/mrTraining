import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, getAthleteMembership, getPaymentHistory } from '@/lib/coaching-db';

function computeIsPayable(membership: { status: string; paymentDueDate: string } | null): boolean {
  if (!membership) return false;
  if (membership.status === 'grace_period' || membership.status === 'suspended') return true;
  try {
    const due = new Date(`${membership.paymentDueDate}T00:00:00Z`);
    if (Number.isNaN(due.getTime())) return false;
    const threshold = new Date(due);
    threshold.setDate(threshold.getDate() - 3);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today >= threshold;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) {
      // New athlete — no membership yet, that's OK
      return NextResponse.json({ status: 'no_membership', membership: null, payments: [], isPayable: false });
    }

    const membership = await getAthleteMembership(athlete.id);
    const payments = await getPaymentHistory(athlete.id);

    if (!membership) {
      return NextResponse.json({ status: 'no_membership', membership: null, payments, isPayable: false });
    }

    const isPayable = computeIsPayable(membership);

    return NextResponse.json({
      membership,
      payments,
      isPayable,
      // Keep flat fields for backward compatibility with existing mobile clients
      id: membership.id,
      status: membership.status,
      planName: membership.planName,
      planPrice: membership.planPrice,
      paymentDueDate: membership.paymentDueDate,
      currentPeriodEnd: membership.currentPeriodEnd,
      currentPeriodStart: membership.currentPeriodStart,
      billingPeriod: membership.billingPeriod,
      athleteId: membership.athleteId,
      coachId: membership.coachId,
    });
  } catch (error) {
    console.error('Error fetching athlete membership:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
