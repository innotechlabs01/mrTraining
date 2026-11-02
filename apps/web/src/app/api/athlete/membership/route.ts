import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, getAthleteMembership, getPaymentHistory } from '@/lib/db';
import { proxyToGo } from '@/lib/api/proxy-helper';

export const dynamic = 'force-dynamic';

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

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try Go API proxy first
    const proxied = await proxyToGo(req, ['athlete', 'membership']);
    if (proxied) {
      return proxied;
    }

    // Fallback to legacy handler on 404 / upstream unavailable
    console.warn('[athlete/membership] Go proxy fallback to legacy handler');

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) {
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
