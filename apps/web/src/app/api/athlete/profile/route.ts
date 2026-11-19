import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

export const dynamic = 'force-dynamic';

interface GoCurrentUser {
  user?: { id: string; email: string; name: string; avatar_url: string; role: string };
  athleteProfile?: {
    id: string;
    name: string;
    email: string;
    sport: string;
    experience_level: string;
    height_cm: number;
    weight_kg: number;
    emergency_contact: string;
    emergency_phone: string;
    modality: string;
    schedule_days: string;
    schedule_time: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
}

interface UpdateProfileBody {
  firstName?: string;
  lastName?: string;
  modality?: string;
  emergencyContact?: string;
  scheduleDays?: string;
  scheduleTime?: string;
}

function normalizeModality(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const v = input.toLowerCase().trim();
  if (v === 'virtual') return 'virtual';
  if (v === 'hibrido' || v === 'híbrido' || v === 'hybrid') return 'hibrido';
  if (v === 'presencial' || v === 'onsite' || v === 'in_person') return 'presencial';
  return null;
}

const VALID_MODALITIES = new Set(['virtual', 'hibrido', 'presencial']);

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { getToken } = await auth();
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Replaces getAthleteProfileById + direct coach_athletes query via
    // coach-isolation-db: GET /api/v1/users/me returns user + athleteProfile
    // (which includes modality, schedule_days, schedule_time, emergency_contact).
    const me = await goFetchServer<GoCurrentUser>(`/api/v1/users/me`, token);
    const profile = me.athleteProfile ?? null;

    return NextResponse.json({
      profile,
      modality: profile?.modality ?? null,
    });
  } catch (error) {
    console.error('Error fetching athlete profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { getToken } = await auth();
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as UpdateProfileBody;
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : undefined;
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : undefined;
    const modalityRaw = body.modality;
    const emergencyContact = typeof body.emergencyContact === 'string' ? body.emergencyContact.trim() : undefined;
    const scheduleDays = typeof body.scheduleDays === 'string' ? body.scheduleDays.trim() : undefined;
    const scheduleTime = typeof body.scheduleTime === 'string' ? body.scheduleTime.trim() : undefined;

    // Name update via users/me (Go API). Replaces direct SQL UPDATE of users /
    // athlete_profiles / coach_athletes via coach-isolation-db.
    if (firstName !== undefined || lastName !== undefined) {
      if (firstName !== undefined && firstName.length < 2) {
        return NextResponse.json({ error: 'First name must be at least 2 characters' }, { status: 400 });
      }
      if (lastName !== undefined && lastName.length < 2) {
        return NextResponse.json({ error: 'Last name must be at least 2 characters' }, { status: 400 });
      }
      let fn = firstName;
      let ln = lastName;
      if (fn === undefined || ln === undefined) {
        const me = await goFetchServer<GoCurrentUser>(`/api/v1/users/me`, token);
        const currentName = ((me.user as Record<string, unknown> | null)?.name as string) ?? '';
        const parts = currentName.split(' ');
        if (fn === undefined) fn = parts[0] ?? '';
        if (ln === undefined) ln = parts.slice(1).join(' ') ?? '';
      }
      const fullName = `${(fn ?? '').trim()} ${(ln ?? '').trim()}`.trim();
      if (!fullName) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }
      try {
        await goFetchServer(`/api/v1/users/me`, token, {
          method: 'PUT',
          body: JSON.stringify({ name: fullName }),
        });
      } catch {
        // best effort
      }
    }

    // Extended athlete profile update via athletes/me (Go API). Replaces direct
    // SQL UPDATE of coach_athletes via coach-isolation-db.
    const profileUpdates: Record<string, unknown> = {};
    if (modalityRaw !== undefined) {
      const normalized = normalizeModality(modalityRaw);
      if (!normalized || !VALID_MODALITIES.has(normalized)) {
        return NextResponse.json({ error: 'Invalid modality. Use virtual, hibrido, or presencial' }, { status: 400 });
      }
      profileUpdates.modality = normalized;
    }
    if (emergencyContact !== undefined) profileUpdates.emergency_contact = emergencyContact;
    if (scheduleDays !== undefined) profileUpdates.schedule_days = scheduleDays;
    if (scheduleTime !== undefined) profileUpdates.schedule_time = scheduleTime;

    if (Object.keys(profileUpdates).length > 0) {
      try {
        await goFetchServer(`/api/v1/athletes/me`, token, {
          method: 'PUT',
          body: JSON.stringify(profileUpdates),
        });
      } catch {
        // best effort
      }
    }

    // Return fresh profile.
    const me = await goFetchServer<GoCurrentUser>(`/api/v1/users/me`, token);
    const profile = me.athleteProfile ?? null;

    return NextResponse.json({ success: true, profile, modality: profile?.modality ?? null });
  } catch (error) {
    console.error('Error updating athlete profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
