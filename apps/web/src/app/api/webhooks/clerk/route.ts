import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { getDB, generateUniqueCoachCode } from '@/lib/coach-isolation-db';
import { getCoachByCode, linkCoachAthlete, createAthleteProfile, getUserById, createUser, getAthleteProfileById } from '@/lib/coach-isolation-db';
import { getAthleteMembership } from '@/lib/coaching-db';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || '';
const clerkSecretKey = process.env.CLERK_SECRET_KEY || '';

async function setClerkMetadata(userId: string, metadata: Record<string, unknown>) {
  if (!clerkSecretKey) {
    console.error('[Webhook] CLERK_SECRET_KEY not set, cannot update metadata');
    return;
  }
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ public_metadata: metadata }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[Webhook] Failed to set Clerk metadata for ${userId}:`, err);
    }
  } catch (err) {
    console.error(`[Webhook] Failed to set Clerk metadata for ${userId}:`, err);
  }
}

async function ensureCoachSync(userId: string, email: string, name: string, avatar: string) {
  const db = getDB();

  // Check if user exists in DB
  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE id = ?',
    args: [userId],
  });

  if (existing.rows.length === 0) {
    // New user — create in DB + generate coachCode
    const coachCode = await generateUniqueCoachCode();

    await db.execute({
      sql: `INSERT INTO users (id, email, name, avatar_url, role) VALUES (?, ?, ?, ?, 'coach')`,
      args: [userId, email, name, avatar],
    });

    await db.execute({
      sql: `INSERT INTO coaches (id, email, name, avatar_url, coach_code) VALUES (?, ?, ?, ?, ?)`,
      args: [userId, email, name, avatar, coachCode],
    });

    await setClerkMetadata(userId, { role: 'coach', coachCode });
    console.log(`[Webhook] Created coach ${userId} with code ${coachCode}`);
  } else {
    // User exists — check if coachCode is in DB
    const coachResult = await db.execute({
      sql: 'SELECT coach_code FROM coaches WHERE id = ?',
      args: [userId],
    });

    let coachCode = coachResult.rows[0]?.coach_code as string | undefined;

    if (!coachCode) {
      // coachCode missing in DB — generate and save
      coachCode = await generateUniqueCoachCode();
      await db.execute({
        sql: 'UPDATE coaches SET coach_code = ?, updated_at = datetime(\'now\') WHERE id = ?',
        args: [coachCode, userId],
      });
      console.log(`[Webhook] Generated missing coachCode ${coachCode} for ${userId}`);
    }

    // Always ensure Clerk metadata has coachCode
    await setClerkMetadata(userId, { role: 'coach', coachCode });
  }
}

async function processAthleteCoachCode(userId: string, email: string, coachCode: string) {
  const db = getDB();
  const normalizedCode = coachCode.trim().toUpperCase();

  // Find coach by code first — validates code before link checks
  const coach = await getCoachByCode(normalizedCode);
  if (!coach) {
    console.error(`[Webhook] Invalid coach code ${normalizedCode} for athlete ${userId} - no coach found`);
    return;
  }

  const coachData = coach as Record<string, unknown>;
  const coachId = coachData.id as string;
  const coachName = coachData.name as string;

  // Check if already linked to a coach
  const existingLink = await db.execute({
    sql: 'SELECT id FROM coach_athlete_links WHERE athlete_id = ? AND status = ?',
    args: [userId, 'active'],
  });

  if (existingLink.rows.length > 0) {
    console.log(`[Webhook] Athlete ${userId} already linked to a coach, ensuring metadata is up to date`);
    // Ensure Clerk metadata reflects athlete role even when link already exists (covers race where user was first created as coach)
    await setClerkMetadata(userId, { role: 'athlete', coachCode: normalizedCode, coachId, coachName });
    return;
  }

  // Create user record if not exists
  const existingUser = await getUserById(userId);
  if (!existingUser) {
    await createUser({ id: userId, email, name: email, role: 'athlete' });
  }

  // Create athlete profile if not exists
  const existingProfile = await getAthleteProfileById(userId);
  if (!existingProfile) {
    await createAthleteProfile({ id: userId, email, name: email });
  }

  // Link coach and athlete (normalized model)
  await linkCoachAthlete(coachId, userId);

  // Create coach_athletes record for dashboard
  const existingAthlete = await db.execute(
    'SELECT id FROM coach_athletes WHERE id = ? AND coach_id = ?',
    [userId, coachId],
  );

  if (existingAthlete.rows.length === 0) {
    await db.execute(
      `INSERT INTO coach_athletes (id, name, email, sport, service_type, start_date, coach_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'), datetime('now'))`,
      [userId, email, email, '', 'linked_via_code', coachId],
    );
  }

  // Create 7-day free trial membership if not exists
  const existingMembership = await getAthleteMembership(userId);
  if (!existingMembership) {
    const now = new Date();
    const startDate = now.toISOString().split('T')[0];
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1, 0);
    periodEnd.setHours(23, 59, 59, 999);
    const periodEndStr = periodEnd.toISOString().split('T')[0];
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

  // Ensure Clerk metadata reflects athlete role — overrides prior coach role if user was initially created as coach
  // Keep coach record intact but role in Clerk must be athlete to drive correct UI/routing
  await setClerkMetadata(userId, { role: 'athlete', coachCode: normalizedCode, coachId, coachName });

  console.log(`[Webhook] Linked athlete ${userId} to coach ${coachId} via code ${normalizedCode}`);
}

export async function POST(req: Request) {
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const payload = await req.text();
  const header = {
    'svix-id': req.headers.get('svix-id')!,
    'svix-timestamp': req.headers.get('svix-timestamp')!,
    'svix-signature': req.headers.get('svix-signature')!,
  };

  let evt: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(webhookSecret);
    evt = wh.verify(payload, header) as { type: string; data: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  const { id, email_addresses, first_name, last_name, image_url, unsafe_metadata } = evt.data;
  const email = (email_addresses as Array<{ email_address: string }>)[0]?.email_address ?? '';
  const name = `${(first_name as string) ?? ''} ${(last_name as string) ?? ''}`.trim() || email;
  const avatar = (image_url as string) ?? '';
  const metadata = (unsafe_metadata as Record<string, unknown>) ?? {};

  try {
    if (evt.type === 'user.created') {
      // Check if this is an athlete with a coach code
      const coachCode = metadata.coachCode as string | undefined;
      if (coachCode) {
        await processAthleteCoachCode(id as string, email, coachCode);
      } else {
        // Default: create as coach
        await ensureCoachSync(id as string, email, name, avatar);
      }
    }

    if (evt.type === 'user.updated') {
      const db = getDB();

      await db.execute({
        sql: `UPDATE users SET email = ?, name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [email, name, avatar, id as string],
      });

      // Check if this is an athlete with a coach code
      const coachCode = metadata.coachCode as string | undefined;
      if (coachCode) {
        await processAthleteCoachCode(id as string, email, coachCode);
      } else {
        // Update coach record
        await db.execute({
          sql: `UPDATE coaches SET email = ?, name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?`,
          args: [email, name, avatar, id as string],
        });
        await ensureCoachSync(id as string, email, name, avatar);
      }
    }

    if (evt.type === 'user.deleted') {
      const db = getDB();
      await db.execute({
        sql: `UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ?`,
        args: [id as string],
      });
      await db.execute({
        sql: `UPDATE coaches SET is_active = 0, updated_at = datetime('now') WHERE id = ?`,
        args: [id as string],
      });
    }
  } catch (err) {
    console.error(`[Webhook] Error processing ${evt.type} for ${id}:`, err);
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
