import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteMembership } from '@/lib/coaching-db';
import { getUserById, createUser, getAthleteProfileById, createAthleteProfile, getDB } from '@/lib/coach-isolation-db';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { sport, experienceLevel, goal, sessionsPerWeek, sessionDuration, equipment } = body;

    // Get email from Clerk user
    const clerkUser = await getUserById(userId);
    const email = clerkUser
      ? (clerkUser as Record<string, unknown>).email as string
      : userId;

    // Create user record if not exists
    if (!clerkUser) {
      await createUser({
        id: userId,
        email,
        name: email,
        role: 'athlete',
      });
    }

    // Create athlete profile if not exists
    const existingProfile = await getAthleteProfileById(userId);
    if (!existingProfile) {
      await createAthleteProfile({
        id: userId,
        email,
        name: email,
        sport: sport || '',
      });
    }

    // Create coach_athletes record for dashboard
    const db = getDB();
    const existingAthlete = await db.execute(
      'SELECT id FROM coach_athletes WHERE id = ?',
      [userId],
    );

    if (existingAthlete.rows.length === 0) {
      // Create a placeholder record — athlete will be linked to coach later via invite code
      await db.execute(
        `INSERT INTO coach_athletes (id, name, email, sport, service_type, start_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))`,
        [userId, email, email, sport || '', 'self_registered'],
      );
    }

    // Create 7-day free trial membership if not exists
    const existingMembership = await db.execute(
      'SELECT id FROM athlete_memberships WHERE athlete_id = ? LIMIT 1',
      [userId],
    );

    if (existingMembership.rows.length === 0) {
      const now = new Date();
      const startDate = now.toISOString().split('T')[0];

      // Period ends at end of current month (after 7-day trial)
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1, 0); // Last day of current month
      periodEnd.setHours(23, 59, 59, 999);
      const periodEndStr = periodEnd.toISOString().split('T')[0];

      // Grace period: 5 days after period end
      const graceDays = 5;
      const dueDate = new Date(periodEnd);
      dueDate.setDate(dueDate.getDate() + graceDays);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      const membershipId = crypto.randomUUID();
      await db.execute(
        `INSERT INTO athlete_memberships (id, athlete_id, plan_name, plan_price, billing_period, status, current_period_start, current_period_end, grace_period_days, payment_due_date)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [membershipId, userId, 'Free Trial', 0, 'monthly', 'active', startDate, periodEndStr, graceDays, dueDateStr],
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error onboarding athlete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
