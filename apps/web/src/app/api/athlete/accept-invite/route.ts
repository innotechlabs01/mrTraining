import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';
import { getCoachByCode, linkCoachAthlete, createAthleteProfile, getUserById, createUser, getAthleteProfileById } from '@/lib/coach-isolation-db';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code, firstName, lastName } = body as {
      code: string;
      firstName?: string;
      lastName?: string;
    };
    if (!code) {
      return NextResponse.json({ error: 'Coach code is required' }, { status: 400 });
    }

    const normalizedCode = code.toUpperCase().trim();

    // Accept invite via Go API (validates code + links athlete to coach)
    const { userId: _, getToken } = await auth();
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const coach = await getCoachByCode(normalizedCode);
    if (!coach) {
      return NextResponse.json({ error: 'Invalid or inactive coach code' }, { status: 404 });
    }

    const coachData = coach as Record<string, unknown>;
    const coachId = coachData.id as string;

    // Accept the invite via Go API
    await goFetchServer(
      `/api/v1/invites/accept`,
      token,
      { method: 'POST', body: JSON.stringify({ code: normalizedCode }) },
    );

    // Get Clerk user info for email
    const existingUser = await getUserById(userId);
    let email = existingUser
      ? ((existingUser as Record<string, unknown>).email as string)
      : userId;

    let clerkFirstName = (firstName as string | undefined)?.trim() ?? '';
    let clerkLastName = (lastName as string | undefined)?.trim() ?? '';
    if ((!clerkFirstName || !clerkLastName) && process.env.CLERK_SECRET_KEY) {
      try {
        const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
          headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
        });
        if (res.ok) {
          const clerkUser = (await res.json()) as Record<string, unknown>;
          if (!email || email === userId || !email.includes('@')) {
            const addresses = clerkUser.email_addresses as Array<{ email_address: string }> | undefined;
            email = addresses?.[0]?.email_address ?? email;
          }
          if (!clerkFirstName) clerkFirstName = (clerkUser.first_name as string) ?? '';
          if (!clerkLastName) clerkLastName = (clerkUser.last_name as string) ?? '';
          const meta = clerkUser.unsafe_metadata as Record<string, unknown> | undefined;
          if (!clerkFirstName && meta?.firstName) clerkFirstName = String(meta.firstName);
          if (!clerkLastName && meta?.lastName) clerkLastName = String(meta.lastName);
        }
      } catch {
        // fallback silently — use whatever we have
      }
    }

    const fullName =
      `${(clerkFirstName || '').trim()} ${(clerkLastName || '').trim()}`.trim() || email;

    // Create user record if not exists
    if (!existingUser) {
      await createUser({
        id: userId,
        email,
        name: fullName,
        role: 'athlete',
      });
    } else {
      const currentName = (existingUser as Record<string, unknown>).name as string;
      if (fullName !== email && (currentName === email || currentName.includes('@'))) {
        // Note: user name update via coach-isolation-db (getDB) — pending full migration
        const { getDB } = await import('@/lib/coach-isolation-db');
        const db = getDB();
        await db.execute({
          sql: `UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?`,
          args: [fullName, userId],
        });
      }
    }

    // Create athlete profile if not exists
    const existingProfile = await getAthleteProfileById(userId);
    if (!existingProfile) {
      await createAthleteProfile({
        id: userId,
        email,
        name: fullName,
      });
    } else {
      const currentName = (existingProfile as Record<string, unknown>).name as string;
      if (fullName !== email && (currentName === email || currentName.includes('@'))) {
        const { getDB } = await import('@/lib/coach-isolation-db');
        const db = getDB();
        await db.execute({
          sql: `UPDATE athlete_profiles SET name = ?, updated_at = datetime('now') WHERE id = ?`,
          args: [fullName, userId],
        });
      }
    }

    // Link coach and athlete (normalized model)
    await linkCoachAthlete(coachId, userId);

    // Check membership via Go API (replaces getAthleteMembership from lib/db)
    let existingMembership: { data?: unknown } | null = null;
    try {
      existingMembership = await goFetchServer<{ data?: unknown }>(
        `/api/v1/memberships`,
        token,
      );
    } catch {
      // No membership yet — will be created or handled separately
    }

    // Create 7-day free trial membership if not exists (via Go API when coach
    // endpoint is available; for now skip direct SQL — membership creation
    // requires coach role in Go)
    if (!existingMembership) {
      // Membership creation via Go requires coach role; the athlete accepting
      // the invite cannot create one directly. The coach creates memberships
      // via POST /api/v1/memberships. This step is intentionally skipped here
      // to avoid direct SQL; membership will be created on the coach side.
    }

    // Sync Clerk public_metadata so dashboard shows relation immediately
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (clerkSecretKey) {
      try {
        await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
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
      } catch {
        // best effort
      }
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
