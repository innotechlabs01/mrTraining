import { safeExecute, generateId } from './db'

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
  const result = await safeExecute(
    'SELECT * FROM schedule_events WHERE coach_id = $1 ORDER BY date, start_time',
    [coachId]
  )
  return result.rows.map((r: Record<string, unknown>) => ({
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
  const id = generateId()
  const now = new Date().toISOString()

  await safeExecute(
    `INSERT INTO schedule_events (id, coach_id, title, description, date, start_time, end_time, type, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
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
  await safeExecute(
    'UPDATE schedule_events SET status = $1, updated_at = $2 WHERE id = $3',
    [status, new Date().toISOString(), id]
  )
}

export async function deleteScheduleEvent(id: string): Promise<void> {
  await safeExecute('DELETE FROM schedule_events WHERE id = $1', [id])
}
