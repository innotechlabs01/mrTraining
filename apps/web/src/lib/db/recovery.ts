/**
 * Recovery DB functions — Turso/LibSQL
 *
 * Tables:
 *   recovery_entries (id, athlete_id, date, sleep_hours, sleep_quality, sleep_bedtime, sleep_wake_time, hrv_current, hrv_baseline, hrv_trend, stress_current, stress_baseline, stress_trend, hydration_current, hydration_goal, recovery_score, subjective_score, created_at, updated_at)
 *   recovery_stretches (id, entry_id, name, duration_sec, completed, category, sort_order)
 *   recovery_ai_recommendations (id, entry_id, type, title, description, reasoning, priority, action_label, dismissed)
 */
import { getDB, generateId, mapRow, safeExecute } from './db'
import type { InValue } from '@libsql/client'

function today() {
  return new Date().toISOString().split('T')[0]
}

/** Get today's recovery entry (or create one with defaults). */
export async function getRecoveryEntry(athleteId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM recovery_entries WHERE athlete_id = ? AND date = ? LIMIT 1',
    [athleteId, today()] as InValue[],
  )
  if (result.rows.length > 0) {
    const entry = mapRow(result.columns)(result.rows[0])
    // Attach stretches and recommendations
    const stretches = await db.execute(
      'SELECT * FROM recovery_stretches WHERE entry_id = ? ORDER BY sort_order',
      [entry.id] as InValue[],
    )
    const recs = await db.execute(
      'SELECT * FROM recovery_ai_recommendations WHERE entry_id = ?',
      [entry.id] as InValue[],
    )
    return {
      ...entry,
      stretches: stretches.rows.map(mapRow(stretches.columns)),
      aiRecommendations: recs.rows.map(mapRow(recs.columns)),
    }
  }

  // Create a default entry for today
  const entryId = generateId()
  await safeExecute(
    db,
    `INSERT INTO recovery_entries (id, athlete_id, date, sleep_hours, sleep_quality, hrv_current, hrv_baseline, stress_current, stress_baseline, hydration_current, hydration_goal, recovery_score, subjective_score)
     VALUES (?, ?, ?, 0, 'unknown', 0, 0, 0, 0, 0, 3000, 0, 0)`,
    [entryId, athleteId, today()],
  )

  return {
    id: entryId,
    athleteId,
    date: today(),
    sleepHours: 0,
    sleepQuality: 'unknown',
    hrvCurrent: 0,
    hrvBaseline: 0,
    stressCurrent: 0,
    stressBaseline: 0,
    hydrationCurrent: 0,
    hydrationGoal: 3000,
    recoveryScore: 0,
    subjectiveScore: 0,
    stretches: [],
    aiRecommendations: [],
  }
}

/** Toggle a stretch's completed status. */
export async function toggleRecoveryStretch(stretchId: string, completed: boolean) {
  const db = getDB()
  await safeExecute(
    db,
    'UPDATE recovery_stretches SET completed = ? WHERE id = ?',
    [completed ? 1 : 0, stretchId],
  )
}

/** Update hydration amount. */
export async function updateRecoveryHydration(entryId: string, current: number) {
  const db = getDB()
  await safeExecute(
    db,
    'UPDATE recovery_entries SET hydration_current = ?, updated_at = datetime(\'now\') WHERE id = ?',
    [current, entryId],
  )
}

/** Update sleep data. */
export async function updateRecoverySleep(
  entryId: string,
  data: { hours?: number; quality?: string; bedtime?: string; wakeTime?: string }
) {
  const db = getDB()
  const updates: string[] = []
  const params: unknown[] = []
  if (data.hours !== undefined) { updates.push('sleep_hours = ?'); params.push(data.hours) }
  if (data.quality !== undefined) { updates.push('sleep_quality = ?'); params.push(data.quality) }
  if (data.bedtime !== undefined) { updates.push('sleep_bedtime = ?'); params.push(data.bedtime) }
  if (data.wakeTime !== undefined) { updates.push('sleep_wake_time = ?'); params.push(data.wakeTime) }
  if (updates.length === 0) return
  updates.push('updated_at = datetime(\'now\')')
  params.push(entryId)
  await safeExecute(db, `UPDATE recovery_entries SET ${updates.join(', ')} WHERE id = ?`, params)
}

/** Update subjective score. */
export async function updateRecoverySubjectiveScore(entryId: string, score: number) {
  const db = getDB()
  await safeExecute(
    db,
    'UPDATE recovery_entries SET subjective_score = ?, updated_at = datetime(\'now\') WHERE id = ?',
    [score, entryId],
  )
}

/** Dismiss an AI recommendation. */
export async function dismissRecoveryRecommendation(recId: string) {
  const db = getDB()
  await safeExecute(
    db,
    'UPDATE recovery_ai_recommendations SET dismissed = 1 WHERE id = ?',
    [recId],
  )
}
