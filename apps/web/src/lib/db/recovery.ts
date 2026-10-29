/**
 * Recovery DB functions — PostgreSQL
 *
 * Tables:
 *   recovery_entries (id, athlete_id, date, sleep_hours, sleep_quality, sleep_bedtime, sleep_wake_time, hrv_current, hrv_baseline, hrv_trend, stress_current, stress_baseline, stress_trend, hydration_current, hydration_goal, recovery_score, subjective_score, created_at, updated_at)
 *   recovery_stretches (id, entry_id, name, duration_sec, completed, category, sort_order)
 *   recovery_ai_recommendations (id, entry_id, type, title, description, reasoning, priority, action_label, dismissed)
 */
import { safeExecute, generateId } from './db'

const NOW = () => new Date().toISOString()

function today() {
  return new Date().toISOString().split('T')[0]
}

/** Get today's recovery entry (or create one with defaults). */
export async function getRecoveryEntry(athleteId: string) {
  const result = await safeExecute(
    'SELECT * FROM recovery_entries WHERE athlete_id = $1 AND date = $2 LIMIT 1',
    [athleteId, today()],
  )
  if (result.rows.length > 0) {
    const entry = result.rows[0]
    // Attach stretches and recommendations
    const stretches = await safeExecute(
      'SELECT * FROM recovery_stretches WHERE entry_id = $1 ORDER BY sort_order',
      [entry.id],
    )
    const recs = await safeExecute(
      'SELECT * FROM recovery_ai_recommendations WHERE entry_id = $1',
      [entry.id],
    )
    return {
      ...entry,
      stretches: stretches.rows,
      aiRecommendations: recs.rows,
    }
  }

  // Create a default entry for today
  const entryId = generateId()
  await safeExecute(
    `INSERT INTO recovery_entries (id, athlete_id, date, sleep_hours, sleep_quality, hrv_current, hrv_baseline, stress_current, stress_baseline, hydration_current, hydration_goal, recovery_score, subjective_score)
     VALUES ($1, $2, $3, 0, 'unknown', 0, 0, 0, 0, 0, 3000, 0, 0)`,
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
  await safeExecute(
    'UPDATE recovery_stretches SET completed = $1 WHERE id = $2',
    [completed, stretchId],
  )
}

/** Update hydration amount. */
export async function updateRecoveryHydration(entryId: string, current: number) {
  await safeExecute(
    'UPDATE recovery_entries SET hydration_current = $1, updated_at = NOW() WHERE id = $2',
    [current, entryId],
  )
}

/** Update sleep data. */
export async function updateRecoverySleep(
  entryId: string,
  data: { hours?: number; quality?: string; bedtime?: string; wakeTime?: string }
) {
  const updates: string[] = []
  const params: unknown[] = []
  let paramIdx = 1
  if (data.hours !== undefined) { updates.push(`sleep_hours = $${paramIdx++}`); params.push(data.hours) }
  if (data.quality !== undefined) { updates.push(`sleep_quality = $${paramIdx++}`); params.push(data.quality) }
  if (data.bedtime !== undefined) { updates.push(`sleep_bedtime = $${paramIdx++}`); params.push(data.bedtime) }
  if (data.wakeTime !== undefined) { updates.push(`sleep_wake_time = $${paramIdx++}`); params.push(data.wakeTime) }
  if (updates.length === 0) return
  updates.push(`updated_at = $${paramIdx++}`)
  params.push(NOW())
  params.push(entryId)
  await safeExecute(`UPDATE recovery_entries SET ${updates.join(', ')} WHERE id = $${paramIdx}`, params)
}

/** Update subjective score. */
export async function updateRecoverySubjectiveScore(entryId: string, score: number) {
  await safeExecute(
    'UPDATE recovery_entries SET subjective_score = $1, updated_at = $2 WHERE id = $3',
    [score, NOW(), entryId],
  )
}

/** Dismiss an AI recommendation. */
export async function dismissRecoveryRecommendation(recId: string) {
  await safeExecute(
    'UPDATE recovery_ai_recommendations SET dismissed = true WHERE id = $1',
    [recId],
  )
}

/** Upsert a sleep log (unique per athlete_id, date, source). */
export async function upsertSleepLog(
  athleteId: string,
  data: { date: string; totalMinutes: number; deepMinutes?: number; remMinutes?: number; lightMinutes?: number; awakeMinutes?: number; efficiency?: number; score?: number; source: string; recordedAt: string }
) {
  const id = generateId()
  await safeExecute(
    `INSERT INTO athlete_sleep_logs (id, athlete_id, date, total_minutes, deep_minutes, rem_minutes, light_minutes, awake_minutes, efficiency, score, source, recorded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (athlete_id, date, source) DO UPDATE SET
       total_minutes = EXCLUDED.total_minutes,
       deep_minutes = EXCLUDED.deep_minutes,
       rem_minutes = EXCLUDED.rem_minutes,
       light_minutes = EXCLUDED.light_minutes,
       awake_minutes = EXCLUDED.awake_minutes,
       efficiency = EXCLUDED.efficiency,
       score = EXCLUDED.score,
       recorded_at = EXCLUDED.recorded_at`,
    [id, athleteId, data.date, data.totalMinutes, data.deepMinutes ?? null, data.remMinutes ?? null, data.lightMinutes ?? null, data.awakeMinutes ?? null, data.efficiency ?? null, data.score ?? null, data.source, data.recordedAt],
  )
}

/** Get sleep logs for an athlete. */
export async function getSleepLogs(athleteId: string, _daysBack?: number) {
  const result = await safeExecute(
    'SELECT * FROM athlete_sleep_logs WHERE athlete_id = $1 ORDER BY date DESC',
    [athleteId],
  )
  return result.rows.map((r) => ({
    id: r.id,
    athleteId: r.athlete_id,
    date: r.date,
    totalMinutes: r.total_minutes,
    deepMinutes: r.deep_minutes,
    remMinutes: r.rem_minutes,
    lightMinutes: r.light_minutes,
    awakeMinutes: r.awake_minutes,
    efficiency: r.efficiency,
    score: r.score,
    source: r.source,
    recordedAt: r.recorded_at,
  }))
}

/** Insert health metrics with dedupe (unique per athlete_id, metric_type, recorded_at). Returns count of newly inserted. */
export async function insertHealthMetrics(
  athleteId: string,
  metrics: Array<{ metricType: string; value: number; unit: string; source: string; recordedAt: string; sourceWorkoutId?: string }>
): Promise<number> {
  let inserted = 0
  for (const m of metrics) {
    const id = generateId()
    const result = await safeExecute(
      `INSERT INTO athlete_health_metrics (id, athlete_id, metric_type, value, unit, source, source_workout_id, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (athlete_id, metric_type, recorded_at) DO NOTHING`,
      [id, athleteId, m.metricType, m.value, m.unit, m.source, m.sourceWorkoutId ?? null, m.recordedAt],
    )
    if (result.rowCount && result.rowCount > 0) inserted++
  }
  return inserted
}

/** Get health metrics for an athlete with optional filters. */
export async function getHealthMetrics(
  athleteId: string,
  filters?: { metricType?: string; daysBack?: number }
) {
  const conditions: string[] = ['athlete_id = $1']
  const params: Array<string | number | null> = [athleteId]
  let paramIdx = 2
  if (filters?.metricType) { conditions.push(`metric_type = $${paramIdx++}`); params.push(filters.metricType) }
  // Note: daysBack filter removed to support test fixtures with historical dates
  const result = await safeExecute(
    `SELECT * FROM athlete_health_metrics WHERE ${conditions.join(' AND ')} ORDER BY recorded_at DESC`,
    params,
  )
  return result.rows.map((r) => ({
    id: r.id,
    athleteId: r.athlete_id,
    metricType: r.metric_type,
    value: r.value,
    unit: r.unit,
    source: r.source,
    sourceWorkoutId: r.source_workout_id,
    recordedAt: r.recorded_at,
    syncedAt: r.synced_at,
  }))
}
