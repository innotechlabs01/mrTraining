/**
 * Schedule DB functions — Turso/LibSQL
 *
 * Maps to the appointments table (schedule_events concept).
 */
import { getDB, generateId, mapRow, safeExecute } from './db'

/** Get all schedule events for a coach. */
export async function getScheduleEvents(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    `SELECT * FROM appointments WHERE coach_id = ? ORDER BY date, start_time`,
    [coachId],
  )
  return result.rows.map(mapRow(result.columns)).map((row: Record<string, unknown>) => ({
    id: row.id,
    workoutId: row.workoutId || '',
    workoutName: row.notes || 'Session',
    athleteIds: row.athleteId ? [row.athleteId] : [],
    athleteNames: row.athleteName ? [row.athleteName] : [],
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
    coachNotes: row.notes || '',
    createdAt: row.createdAt || row.date,
  }))
}

/** Create a new schedule event. */
export async function createScheduleEvent(coachId: string, data: {
  workoutId: string
  workoutName: string
  athleteIds: string[]
  athleteNames: string[]
  date: string
  startTime: string
  endTime: string
  coachNotes?: string
}) {
  const db = getDB()
  const id = generateId()
  await safeExecute(
    db,
    `INSERT INTO appointments (id, coach_id, athlete_id, athlete_name, date, start_time, end_time, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
    [id, coachId, data.athleteIds[0] || '', data.athleteNames[0] || '', data.date, data.startTime, data.endTime, data.coachNotes || ''],
  )
  return { id, ...data, status: 'draft' }
}

/** Update schedule event status. */
export async function updateScheduleEventStatus(id: string, status: string) {
  const db = getDB()
  await safeExecute(
    db,
    'UPDATE appointments SET status = ? WHERE id = ?',
    [status, id],
  )
}

/** Delete a schedule event. */
export async function deleteScheduleEvent(id: string) {
  const db = getDB()
  await safeExecute(db, 'DELETE FROM appointments WHERE id = ?', [id])
}
