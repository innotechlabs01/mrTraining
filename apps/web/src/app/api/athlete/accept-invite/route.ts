import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

interface GoAcceptResult {
  success: boolean;
  coachId?: string;
  coachName?: string;
}

interface GoCurrentUser {
  user?: { id: string; email: string; name: string; avatar_url: string; role: string };
}

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

    // Accept invite via Go API (validates code, links athlete to coach,
    // returns coachId + coachName). Replaces getCoachByCode + linkCoachAthlete
    // from coach-isolation-db (lib/db).
    const { getToken } = await auth();
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let coachId = '';
    let coachName = '';
    try {
      const result = await goFetchServer<GoAcceptResult>(
        `/api/v1/invites/accept`,
        token,
        { method: 'POST', body: JSON.stringify({ code: normalizedCode }) },
      );
      coachId = result.coachId ?? '';
      coachName = result.coachName ?? '';
    } catch {
      return NextResponse.json({ error: 'Invalid or inactive coach code' }, { status: 404 });
    }

    // Get Clerk user info for email/name (Clerk API, not lib/db).
    let email = userId;
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

    // Ensure user + athlete profile exist in Go DB (auto-provisioned by
    // GET /users/me from Clerk identity when the webhook missed them).
    // Replaces getUserById / createUser / getAthleteProfileById /
    // createAthleteProfile from coach-isolation-db (lib/db).
    let userName = email;
    let userAvatar = '';
    try {
      const me = await goFetchServer<GoCurrentUser>(
        `/api/v1/users/me`,
        token,
      );
      userName = me.user?.name ?? email;
      userAvatar = me.user?.avatar_url ?? '';
    } catch {
      // If /users/me fails, proceed with Clerk-derived values.
    }

    // Update user name in Go if it's still a placeholder (email) and we have
    // a real name from Clerk. Replaces direct SQL UPDATE via coach-isolation-db.
    if (fullName !== email && (userName === email || userName.includes('@'))) {
      try {
        await goFetchServer(
          `/api/v1/users/me`,
          token,
          { method: 'PUT', body: JSON.stringify({ name: fullName, avatar_url: userAvatar }) },
        );
      } catch {
        // best effort
      }
    }

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
              coachName,
            },
          }),
        });
      } catch {
        // best effort
      }
    }

    return NextResponse.json({
      success: true,
      coachName,
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
