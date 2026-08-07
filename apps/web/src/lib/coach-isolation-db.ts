/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck -- libsql execute args are runtime-safe; InValue type too strict for dynamic query building
/* eslint-enable @typescript-eslint/ban-ts-comment */
import { createClient } from '@libsql/client';

export function getDB() {
  const url = process.env.TURSO_URL || process.env.DATABASE_URL || 'file:local.db';
  const authToken = process.env.TURSO_AUTH_TOKEN || '';
  return createClient({ url, authToken });
}

// ============== Users ==============

export async function getUserById(id: string) {
  const db = getDB();
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [id],
  });
  return result.rows[0] ?? null;
}

export async function createUser(data: {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: string;
}) {
  const db = getDB();
  await db.execute({
    sql: `INSERT OR IGNORE INTO users (id, email, name, avatar_url, role) VALUES (?, ?, ?, ?, ?)`,
    args: [data.id, data.email, data.name, data.avatar_url ?? '', data.role],
  });
}

// ============== Coaches ==============

export async function getCoachById(id: string) {
  const db = getDB();
  const result = await db.execute({
    sql: 'SELECT * FROM coaches WHERE id = ?',
    args: [id],
  });
  return result.rows[0] ?? null;
}

export async function createCoach(data: {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  coach_code?: string;
}) {
  const db = getDB();
  await db.execute({
    sql: `INSERT OR IGNORE INTO coaches (id, email, name, avatar_url, coach_code) VALUES (?, ?, ?, ?, ?)`,
    args: [data.id, data.email, data.name, data.avatar_url ?? '', data.coach_code ?? ''],
  });
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
  const db = getDB();
  const result = await db.execute({
    sql: 'SELECT * FROM coaches WHERE coach_code = ? AND is_active = 1',
    args: [code],
  });
  return result.rows[0] ?? null;
}

export async function isCoachCodeUnique(code: string): Promise<boolean> {
  const db = getDB();
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM coaches WHERE coach_code = ?',
    args: [code],
  });
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
  const db = getDB();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(data.avatar_url); }
  if (data.specializations !== undefined) { fields.push('specializations = ?'); values.push(data.specializations); }
  if (data.certifications !== undefined) { fields.push('certifications = ?'); values.push(data.certifications); }
  if (data.bio !== undefined) { fields.push('bio = ?'); values.push(data.bio); }
  if (data.experience_years !== undefined) { fields.push('experience_years = ?'); values.push(data.experience_years); }
  if (data.max_athletes !== undefined) { fields.push('max_athletes = ?'); values.push(data.max_athletes); }
  if (data.is_accepting_athletes !== undefined) { fields.push('is_accepting_athletes = ?'); values.push(data.is_accepting_athletes); }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.execute({
    sql: `UPDATE coaches SET ${fields.join(', ')} WHERE id = ?`,
    args: values as InValue[],
  });
}

// ============== Athlete Profiles ==============

export async function getAthleteProfileById(id: string) {
  const db = getDB();
  const result = await db.execute({
    sql: 'SELECT * FROM athlete_profiles WHERE id = ?',
    args: [id],
  });
  return result.rows[0] ?? null;
}

export async function createAthleteProfile(data: {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  sport?: string;
}) {
  const db = getDB();
  await db.execute({
    sql: `INSERT OR IGNORE INTO athlete_profiles (id, email, name, avatar_url, sport) VALUES (?, ?, ?, ?, ?)`,
    args: [data.id, data.email, data.name, data.avatar_url ?? '', data.sport ?? ''],
  });
}

// ============== Coach-Athlete Links ==============

export async function getCoachAthletes(coachId: string) {
  const db = getDB();
  const result = await db.execute({
    sql: `SELECT ap.* FROM athlete_profiles ap
          INNER JOIN coach_athlete_links cal ON ap.id = cal.athlete_id
          WHERE cal.coach_id = ? AND cal.status = 'active'
          ORDER BY ap.name`,
    args: [coachId],
  });
  return result.rows;
}

export async function getAthleteCoaches(athleteId: string) {
  const db = getDB();
  const result = await db.execute({
    sql: `SELECT c.* FROM coaches c
          INNER JOIN coach_athlete_links cal ON c.id = cal.coach_id
          WHERE cal.athlete_id = ? AND cal.status = 'active'`,
    args: [athleteId],
  });
  return result.rows;
}

export async function isAthleteOfCoach(coachId: string, athleteId: string): Promise<boolean> {
  const db = getDB();
  const result = await db.execute({
    sql: `SELECT COUNT(*) as count FROM coach_athlete_links
          WHERE coach_id = ? AND athlete_id = ? AND status = 'active'`,
    args: [coachId, athleteId],
  });
  const row = result.rows[0] as Record<string, unknown>;
  return (row?.count as number) > 0;
}

export async function linkCoachAthlete(coachId: string, athleteId: string, isPrimary: number = 1) {
  const db = getDB();
  await db.execute({
    sql: `INSERT OR IGNORE INTO coach_athlete_links (coach_id, athlete_id, is_primary) VALUES (?, ?, ?)`,
    args: [coachId, athleteId, isPrimary],
  });
}

export async function unlinkCoachAthlete(coachId: string, athleteId: string) {
  const db = getDB();
  await db.execute({
    sql: `UPDATE coach_athlete_links SET status = 'ended' WHERE coach_id = ? AND athlete_id = ?`,
    args: [coachId, athleteId],
  });
}

export async function getCoachAthleteCount(coachId: string): Promise<number> {
  const db = getDB();
  const result = await db.execute({
    sql: `SELECT COUNT(*) as count FROM coach_athlete_links WHERE coach_id = ? AND status = 'active'`,
    args: [coachId],
  });
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
  const db = getDB();
  await db.execute({
    sql: `INSERT INTO pending_invites (id, coach_id, email, clerk_invitation_id, expires_at) VALUES (?, ?, ?, ?, ?)`,
    args: [data.id, data.coach_id, data.email, data.clerk_invitation_id, data.expires_at],
  });
}

export async function getPendingInviteByToken(clerkInvitationId: string) {
  const db = getDB();
  const result = await db.execute({
    sql: `SELECT * FROM pending_invites WHERE clerk_invitation_id = ? AND status = 'pending'`,
    args: [clerkInvitationId],
  });
  return result.rows[0] ?? null;
}

export async function acceptPendingInvite(clerkInvitationId: string) {
  const db = getDB();
  await db.execute({
    sql: `UPDATE pending_invites SET status = 'accepted' WHERE clerk_invitation_id = ?`,
    args: [clerkInvitationId],
  });
}

export async function getPendingInvitesByCoach(coachId: string) {
  const db = getDB();
  const result = await db.execute({
    sql: `SELECT * FROM pending_invites WHERE coach_id = ? AND status = 'pending' ORDER BY created_at DESC`,
    args: [coachId],
  });
  return result.rows;
}
