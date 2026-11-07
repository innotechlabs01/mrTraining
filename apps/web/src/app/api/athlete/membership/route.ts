import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

interface GoMembership {
  id: string;
  athlete_id: string;
  coach_id: string;
  plan_name: string;
  plan_price: number;
  billing_period: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  grace_period_days: number;
  payment_due_date: string;
  created_at: string;
  updated_at: string;
}

interface GoPayment {
  id: string;
  membership_id: string;
  amount: number;
  currency: string;
  status: string;
  polar_order_id?: string;
  period_start: string;
  period_end: string;
  paid_at?: string;
  created_at: string;
}

interface GoPaymentsList {
  data: GoPayment[];
  total: number;
  page: number;
  limit: number;
}

function computeIsPayable(membership: GoMembership | null): boolean {
  if (!membership) return false;
  // Backend-authoritative statuses: a membership becomes payable once it is
  // past due, expired, or cancelled (renew/recover). "grace_period" and
  // "suspended" are not statuses emitted by the Go API.
  if (membership.status === 'past_due' || membership.status === 'expired' || membership.status === 'cancelled') return true;
  try {
    const due = new Date(`${membership.payment_due_date}T00:00:00Z`);
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

// GET /api/athlete/membership — athlete's membership + payment history (Go API).
export async function GET(req: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Backend is authoritative: an athlete with no membership produces a 404
    // from the Go API. Treat that as "no membership" (NOT an error) so the
    // route can return the canonical empty state instead of a 500.
    let membership: GoMembership | null = null;
    try {
      membership = await goFetchServer<GoMembership | null>('/api/v1/memberships', token);
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const isNoMembership = msg.includes('not found') || msg.includes('404');
      if (!isNoMembership) {
        throw err;
      }
    }

    if (!membership) {
      return NextResponse.json({
        status: 'no_membership',
        membership: null,
        payments: [],
        isPayable: false,
      });
    }

    const paymentsRes = await goFetchServer<GoPaymentsList>(
      `/api/v1/memberships/${membership.id}/payments`,
      token,
    );

    const isPayable = computeIsPayable(membership);

    return NextResponse.json({
      membership: {
        id: membership.id,
        athleteId: membership.athlete_id,
        coachId: membership.coach_id,
        planName: membership.plan_name,
        planPrice: membership.plan_price,
        billingPeriod: membership.billing_period,
        status: membership.status,
        currentPeriodEnd: membership.current_period_end,
        currentPeriodStart: membership.current_period_start,
        paymentDueDate: membership.payment_due_date,
        gracePeriodDays: membership.grace_period_days,
      },
      payments: paymentsRes.data.map((p) => ({
        id: p.id,
        membershipId: p.membership_id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        polarOrderId: p.polar_order_id,
        periodStart: p.period_start,
        periodEnd: p.period_end,
        paidAt: p.paid_at,
      })),
      isPayable,
      id: membership.id,
      status: membership.status,
      planName: membership.plan_name,
      planPrice: membership.plan_price,
      paymentDueDate: membership.payment_due_date,
      currentPeriodEnd: membership.current_period_end,
      currentPeriodStart: membership.current_period_start,
      billingPeriod: membership.billing_period,
      athleteId: membership.athlete_id,
      coachId: membership.coach_id,
    });
  } catch (error) {
    console.error('Error fetching athlete membership:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
