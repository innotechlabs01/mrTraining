import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCoachByCode, linkCoachAthlete, createAthleteProfile, getUserById, createUser, getAthleteProfileById, getDB } from '@/lib/coach-isolation-db';
import { getAthleteMembership } from '@/lib/coaching-db';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Coach code is required' }, { status: 400 });
    }

    const normalizedCode = code.toUpperCase().trim();
    const coach = await getCoachByCode(normalizedCode);
    if (!coach) {
      return NextResponse.json({ error: 'Invalid or inactive coach code' }, { status: 404 });
    }

    const coachData = coach as Record<string, unknown>;
    const coachId = coachData.id as string;

    // Get Clerk user info for email
    const existingUser = await getUserById(userId);
    const email = existingUser
      ? (existingUser as Record<string, unknown>).email as string
      : userId;

    // Create user record if not exists
    if (!existingUser) {
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
      });
    }

    // Link coach and athlete (normalized model)
    await linkCoachAthlete(coachId, userId);

    // ALSO create coach_athletes record so coach can see them in dashboard
    const db = getDB();
    const existing = await db.execute(
      'SELECT id FROM coach_athletes WHERE id = ? AND coach_id = ?',
      [userId, coachId],
    );

    if (existing.rows.length === 0) {
      await db.execute(
        `INSERT INTO coach_athletes (id, name, email, sport, service_type, start_date, coach_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'), datetime('now'))`,
        [userId, email, email, '', 'pending', coachId],
      );
    }

    // Create 7-day free trial membership if not exists
    const existingMembership = await getAthleteMembership(userId);
    if (!existingMembership) {
      const now = new Date();
      const startDate = now.toISOString().split('T')[0];

      // Trial ends in 7 days
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 7);

      // After trial, billing period ends at end of current month
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
        `INSERT INTO athlete_memberships (id, athlete_id, coach_id, plan_name, plan_price, billing_period, status, current_period_start, current_period_end, grace_period_days, payment_due_date)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [membershipId, userId, coachId, 'Free Trial', 0, 'monthly', 'active', startDate, periodEndStr, graceDays, dueDateStr],
      );
    }

    // Sync Clerk public_metadata so dashboard shows relation immediately without waiting for webhook
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (clerkSecretKey) {
      try {
        const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            public_metadata: {
              role: 'athlete',
              coachCode: normalizedCode,
              coachId,
              coachName: coachData.name,
            },
          }),
        });
        if (!clerkRes.ok) {
          const errText = await clerkRes.text();
          console.error(`[accept-invite] Failed to update Clerk metadata for ${userId}:`, errText);
        }
      } catch (err) {
        console.error(`[accept-invite] Error updating Clerk metadata for ${userId}:`, err);
      }
    } else {
      console.warn('[accept-invite] CLERK_SECRET_KEY not set, skipping metadata sync');
    }

    return NextResponse.json({
      success: true,
      coachName: coachData.name,
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
