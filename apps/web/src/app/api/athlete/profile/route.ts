import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteProfileById, getAthleteCoaches, getDB } from '@/lib/coach-isolation-db';

const VALID_MODALITIES = new Set(['virtual', 'hibrido', 'presencial']);

function normalizeModality(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const v = input.toLowerCase().trim();
  if (v === 'virtual') return 'virtual';
  if (v === 'hibrido' || v === 'híbrido' || v === 'hybrid') return 'hibrido';
  if (v === 'presencial' || v === 'onsite' || v === 'in_person') return 'presencial';
  return null;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getAthleteProfileById(userId);
    const coaches = await getAthleteCoaches(userId);

    // Also fetch modality / service_type from coach_athletes for the athlete
    let modality: string | null = null;
    try {
      const db = getDB();
      const res = await db.execute('SELECT service_type FROM coach_athletes WHERE id = ? LIMIT 1', [userId]);
      const row = res.rows[0] as Record<string, unknown> | undefined;
      const st = row?.service_type as string | undefined;
      if (st && st !== 'pending' && st !== 'linked_via_code' && st !== 'self_registered') {
        modality = normalizeModality(st) ?? 'virtual';
      } else if (st) {
        modality = 'virtual';
      } else {
        modality = 'virtual';
      }
    } catch {
      modality = 'virtual';
    }

    // Enrich profile with modality for mobile convenience
    const enriched = profile
      ? { ...(profile as Record<string, unknown>), modality, service_type: modality }
      : null;

    return NextResponse.json({ profile: enriched, coaches, modality });
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

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : undefined;
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : undefined;
    const modalityRaw = body.modality;

    const db = getDB();

    // Handle name update
    if (firstName !== undefined || lastName !== undefined) {
      if (firstName !== undefined && firstName.length < 2) {
        return NextResponse.json({ error: 'First name must be at least 2 characters' }, { status: 400 });
      }
      if (lastName !== undefined && lastName.length < 2) {
        return NextResponse.json({ error: 'Last name must be at least 2 characters' }, { status: 400 });
      }
      // Need both to build full name; if one missing fetch current from DB
      let fn = firstName;
      let ln = lastName;
      if (fn === undefined || ln === undefined) {
        const current = await getAthleteProfileById(userId);
        const currentName = ((current as Record<string, unknown> | null)?.name as string) ?? '';
        const parts = currentName.split(' ');
        if (fn === undefined) fn = parts[0] ?? '';
        if (ln === undefined) ln = parts.slice(1).join(' ') ?? '';
      }
      const fullName = `${(fn ?? '').trim()} ${(ln ?? '').trim()}`.trim();
      if (!fullName) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }

      // Update users
      await db.execute({
        sql: `UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [fullName, userId],
      });
      // Update athlete_profiles
      await db.execute({
        sql: `UPDATE athlete_profiles SET name = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [fullName, userId],
      });
      // Update all coach_athletes rows for this athlete (denormalized)
      await db.execute({
        sql: `UPDATE coach_athletes SET name = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [fullName, userId],
      });
    }

    // Handle modality update
    if (modalityRaw !== undefined) {
      const normalized = normalizeModality(modalityRaw);
      if (!normalized || !VALID_MODALITIES.has(normalized)) {
        return NextResponse.json({ error: 'Invalid modality. Use virtual, hibrido, or presencial' }, { status: 400 });
      }
      await db.execute({
        sql: `UPDATE coach_athletes SET service_type = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [normalized, userId],
      });
    }

    // Return fresh profile
    const profile = await getAthleteProfileById(userId);
    let modality: string | null = null;
    try {
      const res = await db.execute('SELECT service_type FROM coach_athletes WHERE id = ? LIMIT 1', [userId]);
      const row = res.rows[0] as Record<string, unknown> | undefined;
      modality = (row?.service_type as string) ?? 'virtual';
    } catch {
      modality = 'virtual';
    }
    const enriched = profile
      ? { ...(profile as Record<string, unknown>), modality, service_type: modality }
      : null;

    return NextResponse.json({ success: true, profile: enriched, modality });
  } catch (error) {
    console.error('Error updating athlete profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
