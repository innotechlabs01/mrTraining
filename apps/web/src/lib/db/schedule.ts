import { getDB, generateId, safeExecute } from './db'
import type { Row } from '@libsql/client'

export interface ScheduleEvent {
  id: string
  coachId: string
  title: string
  description: string | null
  date: string
  startTime: string
  endTime: string
  type: string
  status: string
  createdAt: string
  updatedAt: string
}

export async function getScheduleEvents(coachId: string): Promise<ScheduleEvent[]> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM schedule_events WHERE coach_id = ? ORDER BY date, start_time',
    [coachId]
  )
  return result.rows.map((r: Row) => ({
    id: r.id as string,
    coachId: r.coach_id as string,
    title: r.title as string,
    description: r.description as string | null,
    date: r.date as string,
    startTime: r.start_time as string,
    endTime: r.end_time as string,
    type: r.type as string,
    status: r.status as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }))
}

export async function createScheduleEvent(coachId: string, data: {
  title: string
  description?: string
  date: string
  startTime: string
  endTime: string
  type: string
}): Promise<ScheduleEvent> {
  const db = getDB()
  const id = generateId()
  const now = new Date().toISOString()

  await safeExecute(
    db,
    `INSERT INTO schedule_events (id, coach_id, title, description, date, start_time, end_time, type, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, coachId, data.title, data.description || null, data.date, data.startTime, data.endTime, data.type, 'scheduled', now, now]
  )

  return {
    id,
    coachId,
    title: data.title,
    description: data.description || null,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    type: data.type,
    status: 'scheduled',
    createdAt: now,
    updatedAt: now,
  }
}

export async function updateScheduleEventStatus(id: string, status: string): Promise<void> {
  const db = getDB()
  await safeExecute(
    db,
    'UPDATE schedule_events SET status = ?, updated_at = ? WHERE id = ?',
    [status, new Date().toISOString(), id]
  )
}

export async function deleteScheduleEvent(id: string): Promise<void> {
  const db = getDB()
  await db.execute('DELETE FROM schedule_events WHERE id = ?', [id])
}