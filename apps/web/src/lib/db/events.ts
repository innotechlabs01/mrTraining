// @ts-nocheck — libsql InValue type is too strict for Record<string, unknown> dynamic params.
import { getDB, generateId } from './db'

// ============== Events ==============

export async function getEvents(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM events WHERE coach_id = ? ORDER BY date',
    [coachId],
  )
  const events = []
  for (const r of result.rows) {
    const athletes = await db.execute('SELECT athlete_id FROM event_athletes WHERE event_id = ?', [r.id])
    const formFields = await db.execute('SELECT * FROM event_form_fields WHERE event_id = ? ORDER BY sort_order', [r.id])
    const listItems = await db.execute('SELECT item FROM event_list_items WHERE event_id = ? ORDER BY sort_order', [r.id])
    const event: Record<string, unknown> = {
      id: r.id, title: r.title, date: r.date, time: r.time, endTime: r.end_time, type: r.type, modality: r.modality,
      location: r.location || '', description: r.description || '', status: r.status as string,
      athleteIds: athletes.rows.map(a => a.athlete_id as string),
      public: r.is_public === 1,
    }
    if (r.format) event.format = r.format as string
    if (formFields.rows.length > 0) {
      event.formFields = formFields.rows.map(f => ({ id: f.id, label: f.label, kind: f.kind, options: f.options ? JSON.parse(f.options as string) : undefined, required: f.required === 1 }))
    }
    if (listItems.rows.length > 0) event.listItems = listItems.rows.map(l => l.item as string)
    if (r.running_distance_km || r.running_pace || r.running_meeting_point) {
      event.running = { distanceKm: r.running_distance_km as number, pace: r.running_pace as string, meetingPoint: r.running_meeting_point as string }
    }
    events.push(event)
  }
  return events
}

export async function saveEvent(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = (data.id as string) || generateId()
  const existing = await db.execute('SELECT id FROM events WHERE id = ? AND coach_id = ?', [id, coachId])
  const running = data.running as Record<string, unknown> | undefined
  if (existing.rows.length > 0) {
    await db.execute(
      'UPDATE events SET title=?, date=?, time=?, end_time=?, type=?, modality=?, location=?, description=?, status=?, format=?, is_public=?, running_distance_km=?, running_pace=?, running_meeting_point=?, updated_at=datetime(\'now\') WHERE id=? AND coach_id=?',
      [data.title, data.date, data.time, data.endTime, data.type, data.modality, data.location || '', data.description || '', data.status, data.format || null, data.public ? 1 : 0, running?.distanceKm || null, running?.pace || null, running?.meetingPoint || null, id, coachId],
    )
  } else {
    await db.execute(
      'INSERT INTO events (id, title, date, time, end_time, type, modality, location, description, status, format, is_public, running_distance_km, running_pace, running_meeting_point, coach_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, data.title, data.date, data.time, data.endTime, data.type, data.modality, data.location || '', data.description || '', data.status, data.format || null, data.public ? 1 : 0, running?.distanceKm || null, running?.pace || null, running?.meetingPoint || null, coachId],
    )
  }
  await db.execute('DELETE FROM event_athletes WHERE event_id = ?', [id])
  for (const aid of (data.athleteIds as string[]) || []) {
    await db.execute('INSERT OR IGNORE INTO event_athletes (event_id, athlete_id) VALUES (?,?)', [id, aid])
  }
  await db.execute('DELETE FROM event_form_fields WHERE event_id = ?', [id])
  for (const f of (data.formFields as Array<Record<string, unknown>>) || []) {
    await db.execute(
      'INSERT INTO event_form_fields (id, event_id, label, kind, options, required, sort_order) VALUES (?,?,?,?,?,?,?)',
      [f.id || generateId(), id, f.label, f.kind, f.options ? JSON.stringify(f.options) : null, f.required ? 1 : 0, f.sort_order || 0],
    )
  }
  await db.execute('DELETE FROM event_list_items WHERE event_id = ?', [id])
  for (const item of (data.listItems as string[]) || []) {
    await db.execute(
      'INSERT INTO event_list_items (id, event_id, item, sort_order) VALUES (?,?,?,?)',
      [generateId(), id, item, 0],
    )
  }
  return id
}

export async function deleteEvent(coachId: string, eventId: string) {
  const db = getDB()
  await db.execute('DELETE FROM events WHERE id = ? AND coach_id = ?', [eventId, coachId])
}

export type EventRegistrationStatus = 'accepted' | 'cancelled'

export type EventRegistration = {
  id: string
  eventId: string
  athleteId: string
  status: EventRegistrationStatus
  createdAt: string
  updatedAt: string
}

export type EventFormResponse = {
  id: string
  eventId: string
  athleteId: string
  fieldId: string
  value: string
  createdAt: string
}

export async function getEventDetail(eventId: string) {
  const db = getDB()
  const result = await db.execute('SELECT * FROM events WHERE id = ?', [eventId])
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  const athletes = await db.execute('SELECT athlete_id FROM event_athletes WHERE event_id = ?', [eventId])
  const formFieldRows = await db.execute('SELECT * FROM event_form_fields WHERE event_id = ? ORDER BY sort_order', [eventId])
  const listItemRows = await db.execute('SELECT item FROM event_list_items WHERE event_id = ? ORDER BY sort_order', [eventId])

  const formFields = formFieldRows.rows.map(f => ({ id: f.id as string, label: f.label as string, kind: f.kind as string, options: f.options ? JSON.parse(f.options as string) : undefined, required: f.required === 1 }))
  const listItems = listItemRows.rows.map(l => l.item as string)
  let running
  if (r.running_distance_km || r.running_pace || r.running_meeting_point) {
    running = { distanceKm: r.running_distance_km as number, pace: r.running_pace as string, meetingPoint: r.running_meeting_point as string }
  }

  // `event` matches the shape a single event carries in getEvents()
  const event: Record<string, unknown> = {
    id: r.id, title: r.title, date: r.date, time: r.time, endTime: r.end_time, type: r.type, modality: r.modality,
    location: r.location || '', description: r.description || '', status: r.status as string,
    athleteIds: athletes.rows.map(a => a.athlete_id as string),
    public: r.is_public === 1,
  }
  if (r.format) event.format = r.format as string
  if (formFields.length > 0) event.formFields = formFields
  if (listItems.length > 0) event.listItems = listItems
  if (running) event.running = running
  return { event, listItems, formFields, running }
}

function registrationRowToObj(r: Record<string, unknown>): EventRegistration {
  return {
    id: r.id as string,
    eventId: r.event_id as string,
    athleteId: r.athlete_id as string,
    status: r.status as EventRegistrationStatus,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

export async function getEventRegistration(eventId: string, athleteId: string): Promise<EventRegistration | null> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM event_registrations WHERE event_id = ? AND athlete_id = ?',
    [eventId, athleteId],
  )
  if (result.rows.length === 0) return null
  return registrationRowToObj(result.rows[0])
}

export async function getEventFormResponses(eventId: string, athleteId: string): Promise<EventFormResponse[]> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM event_form_responses WHERE event_id = ? AND athlete_id = ?',
    [eventId, athleteId],
  )
  return result.rows.map(r => ({ id: r.id as string, eventId: r.event_id as string, athleteId: r.athlete_id as string, fieldId: r.field_id as string, value: r.value as string, createdAt: r.created_at as string }))
}

export async function upsertEventRegistration(eventId: string, athleteId: string, status: EventRegistrationStatus): Promise<EventRegistration> {
  const db = getDB()
  const id = generateId()
  const now = new Date().toISOString()
  await db.execute(
    `INSERT INTO event_registrations (id, event_id, athlete_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(event_id, athlete_id) DO UPDATE SET status = ?, updated_at = ?`,
    [id, eventId, athleteId, status, now, now, status, now],
  )
  const result = await db.execute(
    'SELECT * FROM event_registrations WHERE event_id = ? AND athlete_id = ?',
    [eventId, athleteId],
  )
  return registrationRowToObj(result.rows[0])
}

export async function replaceEventFormResponses(eventId: string, athleteId: string, responses: Array<{ fieldId: string; value: string }>): Promise<void> {
  const db = getDB()
  await db.execute('DELETE FROM event_form_responses WHERE event_id = ? AND athlete_id = ?', [eventId, athleteId])
  for (const response of responses) {
    await db.execute(
      'INSERT INTO event_form_responses (id, event_id, athlete_id, field_id, value, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [generateId(), eventId, athleteId, response.fieldId, response.value, new Date().toISOString()],
    )
  }
}
