import { safeExecute, getDB } from './db'

export { getDB }

// ============== Users ==============

export async function getUserById(id: string) {
  const result = await safeExecute('SELECT * FROM users WHERE id = $1', [id])
  return result.rows[0] ?? null
}

export async function createUser(data: {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: string;
}) {
  await safeExecute(
    `INSERT INTO users (id, email, name, avatar_url, role) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING`,
    [data.id, data.email, data.name, data.avatar_url ?? '', data.role],
  );
}

// ============== Coaches ==============

export async function getCoachById(id: string) {
  const result = await safeExecute('SELECT * FROM coaches WHERE id = $1', [id])
  return result.rows[0] ?? null;
}

export async function createCoach(data: {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  coach_code?: string;
}) {
  await safeExecute(
    `INSERT INTO coaches (id, email, name, avatar_url, coach_code) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING`,
    [data.id, data.email, data.name, data.avatar_url ?? '', data.coach_code ?? ''],
  );
}

export function generateCoachCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MR-${code}`;
}

export async function getCoachByCode(code: string) {
  const result = await safeExecute('SELECT * FROM coaches WHERE coach_code = $1 AND is_active = true', [code])
  return result.rows[0] ?? null;
}

export async function isCoachCodeUnique(code: string): Promise<boolean> {
  const result = await safeExecute('SELECT COUNT(*) as count FROM coaches WHERE coach_code = $1', [code])
  const row = result.rows[0] as Record<string, unknown>;
  return (row?.count as number) === 0;
}

export async function generateUniqueCoachCode(): Promise<string> {
  let code = generateCoachCode();
  let attempts = 0;
  while (!(await isCoachCodeUnique(code)) && attempts < 10) {
    code = generateCoachCode();
    attempts++;
  }
  return code;
}

export async function updateCoach(id: string, data: {
  name?: string;
  avatar_url?: string;
  specializations?: string;
  certifications?: string;
  bio?: string;
  experience_years?: number;
  max_athletes?: number;
  is_accepting_athletes?: number;
}) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (data.name !== undefined) { fields.push(`name = $${paramIdx++}`); values.push(data.name); }
  if (data.avatar_url !== undefined) { fields.push(`avatar_url = $${paramIdx++}`); values.push(data.avatar_url); }
  if (data.specializations !== undefined) { fields.push(`specializations = $${paramIdx++}`); values.push(data.specializations); }
  if (data.certifications !== undefined) { fields.push(`certifications = $${paramIdx++}`); values.push(data.certifications); }
  if (data.bio !== undefined) { fields.push(`bio = $${paramIdx++}`); values.push(data.bio); }
  if (data.experience_years !== undefined) { fields.push(`experience_years = $${paramIdx++}`); values.push(data.experience_years); }
  if (data.max_athletes !== undefined) { fields.push(`max_athletes = $${paramIdx++}`); values.push(data.max_athletes); }
  if (data.is_accepting_athletes !== undefined) { fields.push(`is_accepting_athletes = $${paramIdx++}`); values.push(data.is_accepting_athletes); }

  if (fields.length === 0) return;

  fields.push(`updated_at = $${paramIdx++}`);
  values.push(id);

  await safeExecute(
    `UPDATE coaches SET ${fields.join(', ')} WHERE id = $${paramIdx}`,
    values,
  );
}

// ============== Athlete Profiles ==============

export async function getAthleteProfileById(id: string) {
  const result = await safeExecute('SELECT * FROM athlete_profiles WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function createAthleteProfile(data: {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  sport?: string;
}) {
  await safeExecute(
    `INSERT INTO athlete_profiles (id, email, name, avatar_url, sport) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING`,
    [data.id, data.email, data.name, data.avatar_url ?? '', data.sport ?? ''],
  );
}

// ============== Coach-Athlete Links ==============

export async function getCoachAthletes(coachId: string) {
  const result = await safeExecute(
    `SELECT ap.* FROM athlete_profiles ap
          INNER JOIN coach_athlete_links cal ON ap.id = cal.athlete_id
          WHERE cal.coach_id = $1 AND cal.status = 'active'
          ORDER BY ap.name`,
    [coachId],
  );
  return result.rows;
}

export async function getAthleteCoaches(athleteId: string) {
  const result = await safeExecute(
    `SELECT c.* FROM coaches c
          INNER JOIN coach_athlete_links cal ON c.id = cal.coach_id
          WHERE cal.athlete_id = $1 AND cal.status = 'active'`,
    [athleteId],
  );
  return result.rows;
}

export async function isAthleteOfCoach(coachId: string, athleteId: string): Promise<boolean> {
  const result = await safeExecute(
    `SELECT COUNT(*) as count FROM coach_athlete_links
          WHERE coach_id = $1 AND athlete_id = $2 AND status = 'active'`,
    [coachId, athleteId],
  );
  const row = result.rows[0] as Record<string, unknown>;
  return (row?.count as number) > 0;
}

export async function linkCoachAthlete(coachId: string, athleteId: string, isPrimary: number = 1) {
  await safeExecute(
    `INSERT INTO coach_athlete_links (coach_id, athlete_id, is_primary) VALUES ($1, $2, $3)
     ON CONFLICT (coach_id, athlete_id) DO NOTHING`,
    [coachId, athleteId, isPrimary],
  );
}

export async function unlinkCoachAthlete(coachId: string, athleteId: string) {
  await safeExecute(
    `UPDATE coach_athlete_links SET status = 'ended' WHERE coach_id = $1 AND athlete_id = $2`,
    [coachId, athleteId],
  );
}

export async function getCoachAthleteCount(coachId: string): Promise<number> {
  const result = await safeExecute(
    `SELECT COUNT(*) as count FROM coach_athlete_links WHERE coach_id = $1 AND status = 'active'`,
    [coachId],
  );
  const row = result.rows[0] as Record<string, unknown>;
  return (row?.count as number) ?? 0;
}

// ============== Pending Invites ==============

export async function createPendingInvite(data: {
  id: string;
  coach_id: string;
  email: string;
  clerk_invitation_id: string;
  expires_at: string;
}) {
  await safeExecute(
    `INSERT INTO pending_invites (id, coach_id, email, clerk_invitation_id, expires_at) VALUES ($1, $2, $3, $4, $5)`,
    [data.id, data.coach_id, data.email, data.clerk_invitation_id, data.expires_at],
  );
}

export async function getPendingInviteByToken(clerkInvitationId: string) {
  const result = await safeExecute(
    `SELECT * FROM pending_invites WHERE clerk_invitation_id = $1 AND status = 'pending'`,
    [clerkInvitationId],
  );
  return result.rows[0] ?? null;
}

export async function acceptPendingInvite(clerkInvitationId: string) {
  await safeExecute(
    `UPDATE pending_invites SET status = 'accepted' WHERE clerk_invitation_id = $1`,
    [clerkInvitationId],
  );
}

export async function getPendingInvitesByCoach(coachId: string) {
  const result = await safeExecute(
    `SELECT * FROM pending_invites WHERE coach_id = $1 AND status = 'pending' ORDER BY created_at DESC`,
    [coachId],
  );
  return result.rows;
}
