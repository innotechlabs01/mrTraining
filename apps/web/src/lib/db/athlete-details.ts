/**
 * Athlete Details DB functions — Turso/LibSQL
 *
 * Fetches detailed athlete data for the RightPanel.
 */
import { getDB, mapRow } from './db'

export interface AthleteDetailData {
  id: string
  name: string
  email: string
  phone: string
  sport: string
  serviceType: string
  plan: { name: string; price: number; billingPeriod: string }
  schedule: { days: string; time: string }
  startDate: string
  emergencyContact: string
  weightHistory: { date: string; weight: number; muscleMass: number; bodyFat: number }[]
  runningDevice?: { brand: string; model: string; synced: boolean; lastSync?: string }
  readiness: { sleep: number; hrv: number; recovery: number; score: number }
  flag?: { type: string; severity: string; message: string }
}

/** Get athlete detail data by ID. */
export async function getAthleteDetail(athleteId: string): Promise<AthleteDetailData | null> {
  const db = getDB()

  // Get athlete base info
  const athleteResult = await db.execute(
    'SELECT * FROM athletes WHERE id = ?',
    [athleteId],
  )
  if (athleteResult.rows.length === 0) return null

  const athlete = mapRow(athleteResult.columns)(athleteResult.rows[0]) as Record<string, unknown>

  // Get membership/plan info
  const membershipResult = await db.execute(
    'SELECT * FROM memberships WHERE athlete_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1',
    [athleteId, 'active'],
  )
  const membership = membershipResult.rows.length > 0
    ? mapRow(membershipResult.columns)(membershipResult.rows[0]) as Record<string, unknown>
    : null

  // Get latest recovery data for readiness
  const recoveryResult = await db.execute(
    'SELECT * FROM recovery_entries WHERE athlete_id = ? ORDER BY date DESC LIMIT 1',
    [athleteId],
  )
  const recovery = recoveryResult.rows.length > 0
    ? mapRow(recoveryResult.columns)(recoveryResult.rows[0]) as Record<string, unknown>
    : null

  // Get weight history from progress
  const progressResult = await db.execute(
    'SELECT * FROM progress WHERE athlete_id = ? ORDER BY date DESC LIMIT 6',
    [athleteId],
  )
  const weightHistory = progressResult.rows.map(mapRow(progressResult.columns)).map((row: Record<string, unknown>) => ({
    date: new Date(row.date as string).toLocaleDateString('es-ES', { month: 'short' }),
    weight: Number(row.weightKg) || 0,
    muscleMass: Number(row.muscleMassKg) || 0,
    bodyFat: Number(row.bodyFatPct) || 0,
  })).reverse()

  return {
    id: athleteId,
    name: (athlete.name as string) || 'Unknown',
    email: (athlete.email as string) || '',
    phone: (athlete.phone as string) || '',
    sport: (athlete.sport as string) || '',
    serviceType: (athlete.serviceType as string) || 'Virtual',
    plan: membership ? {
      name: (membership.planName as string) || 'Basic',
      price: Number(membership.planPrice) || 0,
      billingPeriod: (membership.billingPeriod as string) || 'monthly',
    } : { name: 'Basic', price: 0, billingPeriod: 'monthly' },
    schedule: {
      days: (athlete.trainingDays as string) || 'Lun, Mié, Vie',
      time: (athlete.trainingTime as string) || '7:00 - 9:00 AM',
    },
    startDate: athlete.startDate
      ? new Date(athlete.startDate as string).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
      : '',
    emergencyContact: (athlete.emergencyContact as string) || '',
    weightHistory,
    readiness: {
      sleep: recovery ? Number(recovery.sleepHours) || 0 : 0,
      hrv: recovery ? Number(recovery.hrvCurrent) || 0 : 0,
      recovery: recovery ? Number(recovery.recoveryScore) || 0 : 0,
      score: recovery ? Number(recovery.recoveryScore) || 0 : 0,
    },
  }
}
