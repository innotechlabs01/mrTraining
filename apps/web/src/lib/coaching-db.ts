/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck -- libsql execute args are runtime-safe; InValue type too strict for dynamic query building
/* eslint-enable @typescript-eslint/ban-ts-comment */
import { createClient } from '@libsql/client'

export function getDB() {
  const url = process.env.TURSO_URL || process.env.DATABASE_URL || 'file:local.db'
  const authToken = process.env.TURSO_AUTH_TOKEN || ''
  return createClient({ url, authToken })
}

function generateId(): string {
  return crypto.randomUUID()
}

// ============== Time Blocks ==============

export async function getTimeBlocks(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM time_blocks WHERE coach_id = ? ORDER BY display_order',
    [coachId],
  )
  return result.rows.map(mapRow(result.columns))
}

export async function saveTimeBlocks(coachId: string, blocks: Array<{
  id: string; label: string; time: string; endTime: string; icon: string; displayOrder?: number
}>) {
  const db = getDB()
  await db.execute('DELETE FROM time_blocks WHERE coach_id = ?', [coachId])
  for (const b of blocks) {
    await db.execute(
      'INSERT INTO time_blocks (id, label, time, end_time, icon, display_order, coach_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [b.id, b.label, b.time, b.endTime, b.icon, b.displayOrder ?? 0, coachId],
    )
  }
}

// ============== Athletes ==============

export async function getAthletes(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM coach_athletes WHERE coach_id = ? ORDER BY created_at',
    [coachId],
  )
  // Collect athlete IDs that have user_* emails so we can backfill from users table
  const athleteIds = result.rows.map(r => r.id as string)
  const userEmailMap: Record<string, string> = {}
  if (athleteIds.length > 0) {
    const placeholders = athleteIds.map(() => '?').join(',')
    const userRows = await db.execute(
      `SELECT id, email FROM users WHERE id IN (${placeholders})`,
      athleteIds,
    )
    for (const ur of userRows.rows) {
      userEmailMap[ur.id as string] = (ur.email as string) || ''
    }
  }
  return result.rows.map(r => {
    const rawName = (r.name as string) || ''
    let email = (r.email as string) || ''
    // Backfill: if email looks like a Clerk user ID, resolve from users table
    if (email.startsWith('user_') || !email.includes('@')) {
      const resolved = userEmailMap[r.id as string]
      if (resolved && resolved.includes('@')) {
        email = resolved
      }
    }
    // Defensive: if DB still has email or user_ id as name, fall back to email local part
    const name =
      !rawName || rawName.startsWith('user_') || rawName.includes('@')
        ? email.split('@')[0] || rawName || 'Athlete'
        : rawName
    return {
      id: r.id as string,
      name,
      avatarUrl: r.avatar_url as string || '',
      sport: r.sport as string,
      email,
      phone: r.phone as string || '',
      serviceType: r.service_type as string || '',
      plan: { name: r.plan_name as string || '', price: r.plan_price as number || 0, billingPeriod: r.plan_billing as string || 'mensual' },
      schedule: { days: r.schedule_days as string || '', time: r.schedule_time as string || '' },
      startDate: r.start_date as string || '',
      emergencyContact: r.emergency_contact as string || '',
      readiness: { sleep: r.sleep as number || 0, hrv: r.hrv as number || 0, recovery: r.recovery as number || 0, score: r.readiness_score as number || 0 },
      flag: r.flag_type ? { type: r.flag_type as string, severity: r.flag_severity as string, message: r.flag_message as string } : undefined,
      runningDevice: r.running_device_brand ? { brand: r.running_device_brand as string, model: r.running_device_model as string, synced: Boolean(r.running_device_synced), lastSync: r.running_device_last_sync as string || undefined } : undefined,
      weightHistory: [] as Array<{ date: string; weight: number; muscleMass: number; bodyFat: number }>,
      todaySessionIds: [] as string[],
    }
  })
}

export async function getAthleteById(coachId: string, athleteId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM coach_athletes WHERE coach_id = ? AND id = ?',
    [coachId, athleteId],
  )
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  const weightRows = await db.execute(
    'SELECT * FROM athlete_weight_history WHERE athlete_id = ? ORDER BY date',
    [athleteId],
  )
  const rawName = (r.name as string) || ''
  let email = (r.email as string) || ''
  // Backfill: if email looks like a Clerk user ID, resolve from users table
  if (email.startsWith('user_') || !email.includes('@')) {
    const userRows = await db.execute('SELECT email FROM users WHERE id = ?', [athleteId])
    const resolved = userRows.rows[0]?.email as string | undefined
    if (resolved && resolved.includes('@')) {
      email = resolved
    }
  }
  const name =
    !rawName || rawName.startsWith('user_') || rawName.includes('@')
      ? email.split('@')[0] || rawName || 'Athlete'
      : rawName
  return {
    id: r.id as string,
    name,
    avatarUrl: r.avatar_url as string || '',
    sport: r.sport as string,
    email,
    phone: r.phone as string || '',
    serviceType: r.service_type as string || '',
    plan: { name: r.plan_name as string || '', price: r.plan_price as number || 0, billingPeriod: r.plan_billing as string || 'mensual' },
    schedule: { days: r.schedule_days as string || '', time: r.schedule_time as string || '' },
    startDate: r.start_date as string || '',
    emergencyContact: r.emergency_contact as string || '',
    readiness: { sleep: r.sleep as number || 0, hrv: r.hrv as number || 0, recovery: r.recovery as number || 0, score: r.readiness_score as number || 0 },
    flag: r.flag_type ? { type: r.flag_type as string, severity: r.flag_severity as string, message: r.flag_message as string } : undefined,
    runningDevice: r.running_device_brand ? { brand: r.running_device_brand as string, model: r.running_device_model as string, synced: Boolean(r.running_device_synced), lastSync: r.running_device_last_sync as string || undefined } : undefined,
    weightHistory: weightRows.rows.map(w => ({ date: w.date as string, weight: w.weight as number, muscleMass: w.muscle_mass as number, bodyFat: w.body_fat as number })),
    todaySessionIds: [] as string[],
  }
}

export async function saveAthlete(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = (data.id as string) || generateId()
  const existing = await db.execute('SELECT id FROM coach_athletes WHERE id = ? AND coach_id = ?', [id, coachId])
  if (existing.rows.length > 0) {
    const plan = data.plan as Record<string, unknown> | undefined
    const schedule = data.schedule as Record<string, unknown> | undefined
    const readiness = data.readiness as Record<string, unknown> | undefined
    const flag = data.flag as Record<string, unknown> | undefined
    const runningDevice = data.runningDevice as Record<string, unknown> | undefined
    await db.execute(
      `UPDATE coach_athletes SET name=?, sport=?, email=?, phone=?, service_type=?, plan_name=?, plan_price=?, plan_billing=?, schedule_days=?, schedule_time=?, start_date=?, emergency_contact=?, sleep=?, hrv=?, recovery=?, readiness_score=?, flag_type=?, flag_severity=?, flag_message=?, running_device_brand=?, running_device_model=?, running_device_synced=?, running_device_last_sync=?, updated_at=datetime('now') WHERE id=? AND coach_id=?`,
      [data.name, data.sport, data.email, data.phone, data.serviceType, plan?.name, plan?.price, plan?.billingPeriod, schedule?.days, schedule?.time, data.startDate, data.emergencyContact, readiness?.sleep, readiness?.hrv, readiness?.recovery, readiness?.score, flag?.type || '', flag?.severity || '', flag?.message || '', runningDevice?.brand || '', runningDevice?.model || '', runningDevice?.synced ? 1 : 0, runningDevice?.lastSync || '', id, coachId],
    )
  } else {
    const plan = data.plan as Record<string, unknown> | undefined
    const schedule = data.schedule as Record<string, unknown> | undefined
    const readiness = data.readiness as Record<string, unknown> | undefined
    const flag = data.flag as Record<string, unknown> | undefined
    const runningDevice = data.runningDevice as Record<string, unknown> | undefined
    await db.execute(
      `INSERT INTO coach_athletes (id, name, sport, email, phone, service_type, plan_name, plan_price, plan_billing, schedule_days, schedule_time, start_date, emergency_contact, sleep, hrv, recovery, readiness_score, flag_type, flag_severity, flag_message, running_device_brand, running_device_model, running_device_synced, running_device_last_sync, coach_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, data.name, data.sport, data.email, data.phone, data.serviceType, plan?.name, plan?.price, plan?.billingPeriod, schedule?.days, schedule?.time, data.startDate, data.emergencyContact, readiness?.sleep, readiness?.hrv, readiness?.recovery, readiness?.score, flag?.type || '', flag?.severity || '', flag?.message || '', runningDevice?.brand || '', runningDevice?.model || '', runningDevice?.synced ? 1 : 0, runningDevice?.lastSync || '', coachId],
    )
  }
  if (data.weightHistory && Array.isArray(data.weightHistory)) {
    await db.execute('DELETE FROM athlete_weight_history WHERE athlete_id = ?', [id])
    for (const w of data.weightHistory as Array<Record<string, unknown>>) {
      await db.execute(
        'INSERT INTO athlete_weight_history (id, athlete_id, date, weight, muscle_mass, body_fat) VALUES (?,?,?,?,?,?)',
        [generateId(), id, w.date, w.weight, w.muscleMass || 0, w.bodyFat || 0],
      )
    }
  }
  return id
}

export async function deleteAthlete(coachId: string, athleteId: string) {
  const db = getDB()
  await db.execute('DELETE FROM coach_athletes WHERE id = ? AND coach_id = ?', [athleteId, coachId])
}

// ============== Sessions ==============

export async function getSessions(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM coach_sessions WHERE coach_id = ? ORDER BY time',
    [coachId],
  )
  const sessions = []
  for (const r of result.rows) {
    const exercises = await db.execute('SELECT * FROM session_exercises WHERE session_id = ? ORDER BY sort_order', [r.id])
    const adjustments = await db.execute('SELECT * FROM session_ai_adjustments WHERE session_id = ?', [r.id])
    const athleteRows = await db.execute('SELECT athlete_id FROM session_athletes WHERE session_id = ?', [r.id])
    sessions.push({
      id: r.id as string,
      name: r.name as string,
      time: r.time as string,
      endTime: r.end_time as string,
      location: r.location as string || '',
      status: r.status as string,
      athleteIds: athleteRows.rows.map(a => a.athlete_id as string),
      exercises: exercises.rows.map(e => ({ id: e.id, name: e.name, sets: e.sets, reps: e.reps, rest: e.rest, weight: e.weight, notes: e.notes })),
      aiAdjustments: adjustments.rows.map(a => ({ id: a.id, type: a.type, title: a.title, description: a.description, reasoning: a.reasoning, actionLabel: a.action_label, applied: Boolean(a.applied), dismissed: Boolean(a.dismissed) })),
    })
  }
  return sessions
}

export async function saveSession(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = (data.id as string) || generateId()
  const existing = await db.execute('SELECT id FROM coach_sessions WHERE id = ? AND coach_id = ?', [id, coachId])
  if (existing.rows.length > 0) {
    await db.execute(
      'UPDATE coach_sessions SET name=?, time=?, end_time=?, location=?, status=?, updated_at=datetime(\'now\') WHERE id=? AND coach_id=?',
      [data.name, data.time, data.endTime, data.location, data.status, id, coachId],
    )
  } else {
    await db.execute(
      'INSERT INTO coach_sessions (id, name, time, end_time, location, status, coach_id) VALUES (?,?,?,?,?,?,?)',
      [id, data.name, data.time, data.endTime, data.location, data.status, coachId],
    )
  }
  await db.execute('DELETE FROM session_athletes WHERE session_id = ?', [id])
  for (const aid of (data.athleteIds as string[]) || []) {
    await db.execute('INSERT OR IGNORE INTO session_athletes (session_id, athlete_id) VALUES (?,?)', [id, aid])
  }
  await db.execute('DELETE FROM session_exercises WHERE session_id = ?', [id])
  for (const e of (data.exercises as Array<Record<string, unknown>>) || []) {
    await db.execute(
      'INSERT INTO session_exercises (id, session_id, name, sets, reps, rest, weight, notes, sort_order) VALUES (?,?,?,?,?,?,?,?,?)',
      [e.id || generateId(), id, e.name, e.sets, e.reps, e.rest, e.weight, e.notes || '', e.sort_order || 0],
    )
  }
  await db.execute('DELETE FROM session_ai_adjustments WHERE session_id = ?', [id])
  for (const a of (data.aiAdjustments as Array<Record<string, unknown>>) || []) {
    await db.execute(
      'INSERT INTO session_ai_adjustments (id, session_id, type, title, description, reasoning, action_label, applied, dismissed) VALUES (?,?,?,?,?,?,?,?,?)',
      [a.id || generateId(), id, a.type, a.title, a.description, a.reasoning, a.actionLabel, a.applied ? 1 : 0, a.dismissed ? 1 : 0],
    )
  }
  return id
}

export async function deleteSession(coachId: string, sessionId: string) {
  const db = getDB()
  await db.execute('DELETE FROM coach_sessions WHERE id = ? AND coach_id = ?', [sessionId, coachId])
}

// ============== Messages ==============

export async function getMessageThreads(coachId: string) {
  const db = getDB()
  const threads = await db.execute(
    'SELECT * FROM message_threads WHERE coach_id = ? ORDER BY updated_at DESC',
    [coachId],
  )
  const result = []
  for (const t of threads.rows) {
    const participants = await db.execute('SELECT * FROM thread_participants WHERE thread_id = ?', [t.id])
    const messages = await db.execute('SELECT * FROM messages WHERE thread_id = ? ORDER BY timestamp ASC', [t.id])
    const msgRows = messages.rows.map(m => ({
      id: m.id as string, senderId: m.sender_id as string, senderName: m.sender_name as string,
      content: m.content as string, timestamp: m.timestamp as string, type: m.msg_type as string,
    }))
    result.push({
      id: t.id as string,
      participants: participants.rows.map(p => ({ id: p.athlete_id as string, name: p.name as string, avatarUrl: p.avatar_url as string || '' })),
      lastMessage: msgRows[msgRows.length - 1],
      unread: false,
      messages: msgRows,
    })
  }
  return result
}

export async function saveMessage(coachId: string, threadId: string, data: Record<string, unknown>) {
  const db = getDB()
  const msgId = generateId()
  await db.execute(
    'INSERT INTO messages (id, thread_id, sender_id, sender_name, content, msg_type, timestamp) VALUES (?,?,?,?,?,?,datetime(\'now\'))',
    [msgId, threadId, data.senderId, data.senderName, data.content, data.type || 'text'],
  )
  await db.execute('UPDATE message_threads SET updated_at=datetime(\'now\') WHERE id=?', [threadId])
  return msgId
}

export async function createThread(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const threadId = generateId()
  await db.execute('INSERT INTO message_threads (id, coach_id) VALUES (?,?)', [threadId, coachId])
  for (const p of (data.participants as Array<Record<string, unknown>>) || []) {
    await db.execute(
      'INSERT INTO thread_participants (thread_id, athlete_id, name, avatar_url) VALUES (?,?,?,?)',
      [threadId, p.id, p.name, p.avatarUrl || ''],
    )
  }
  return threadId
}

// ============== Daily Summary ==============

export async function getDailySummary(coachId: string, date?: string) {
  const db = getDB()
  const targetDate = date || new Date().toISOString().split('T')[0]
  const result = await db.execute(
    'SELECT * FROM daily_summaries WHERE coach_id = ? AND date = ? ORDER BY created_at DESC LIMIT 1',
    [coachId, targetDate],
  )
  if (result.rows.length === 0) return null
  const s = result.rows[0]
  const highlights = await db.execute('SELECT text FROM daily_highlights WHERE summary_id = ? ORDER BY sort_order', [s.id])
  const names = await db.execute('SELECT name FROM completed_session_names WHERE summary_id = ?', [s.id])
  return {
    date: s.date as string,
    athleteCount: s.athlete_count as number,
    sessionCount: s.session_count as number,
    completedSessions: s.completed_sessions as number,
    completedSessionNames: names.rows.map(n => n.name as string),
    messageCount: s.message_count as number,
    notesCount: s.notes_count as number,
    highlights: highlights.rows.map(h => h.text as string),
    aiRecommendation: s.ai_recommendation as string || '',
    tomorrowPreview: {
      athleteCount: s.tomorrow_athlete_count as number,
      sessionCount: s.tomorrow_session_count as number,
      suggestedFocus: s.tomorrow_focus as string || '',
    },
  }
}

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

// ============== Plans ==============

export async function getPlans(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM plans WHERE coach_id = ? ORDER BY price',
    [coachId],
  )
  const plans = []
  for (const r of result.rows) {
    const modes = await db.execute('SELECT mode FROM plan_training_modes WHERE plan_id = ?', [r.id])
    const features = await db.execute('SELECT feature FROM plan_features WHERE plan_id = ? ORDER BY sort_order', [r.id])
    const plan: Record<string, unknown> = {
      id: r.id, name: r.name, description: r.description, price: r.price, currency: r.currency, billingPeriod: r.billing_period,
      trainingMode: modes.rows.map(m => m.mode as string),
      maxAthletes: r.max_athletes, maxSessionsPerWeek: r.max_sessions_per_week,
      features: features.rows.map(f => f.feature as string),
      isActive: r.is_active === 1, athleteCount: r.athlete_count,
    }
    if (r.discount_type) {
      plan.discount = { type: r.discount_type, value: r.discount_value, label: r.discount_label, validFrom: r.discount_valid_from, validUntil: r.discount_valid_until, code: r.discount_code }
    }
    plans.push(plan)
  }
  return plans
}

export async function savePlan(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = (data.id as string) || generateId()
  const discount = data.discount as Record<string, unknown> | undefined
  const existing = await db.execute('SELECT id FROM plans WHERE id = ? AND coach_id = ?', [id, coachId])
  if (existing.rows.length > 0) {
    await db.execute(
      'UPDATE plans SET name=?, description=?, price=?, currency=?, billing_period=?, max_athletes=?, max_sessions_per_week=?, is_active=?, athlete_count=?, discount_type=?, discount_value=?, discount_label=?, discount_valid_from=?, discount_valid_until=?, discount_code=?, updated_at=datetime(\'now\') WHERE id=? AND coach_id=?',
      [data.name, data.description, data.price, data.currency, data.billingPeriod, data.maxAthletes, data.maxSessionsPerWeek, data.isActive ? 1 : 0, data.athleteCount || 0, discount?.type || null, discount?.value || null, discount?.label || null, discount?.validFrom || null, discount?.validUntil || null, discount?.code || null, id, coachId],
    )
  } else {
    await db.execute(
      'INSERT INTO plans (id, name, description, price, currency, billing_period, max_athletes, max_sessions_per_week, is_active, athlete_count, discount_type, discount_value, discount_label, discount_valid_from, discount_valid_until, discount_code, coach_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, data.name, data.description, data.price, data.currency, data.billingPeriod, data.maxAthletes, data.maxSessionsPerWeek, data.isActive ? 1 : 0, data.athleteCount || 0, discount?.type || null, discount?.value || null, discount?.label || null, discount?.validFrom || null, discount?.validUntil || null, discount?.code || null, coachId],
    )
  }
  await db.execute('DELETE FROM plan_training_modes WHERE plan_id = ?', [id])
  for (const mode of (data.trainingMode as string[]) || []) {
    await db.execute('INSERT OR IGNORE INTO plan_training_modes (plan_id, mode) VALUES (?,?)', [id, mode])
  }
  await db.execute('DELETE FROM plan_features WHERE plan_id = ?', [id])
  for (let i = 0; i < ((data.features as string[]) || []).length; i++) {
    await db.execute('INSERT INTO plan_features (id, plan_id, feature, sort_order) VALUES (?,?,?,?)', [generateId(), id, (data.features as string[])[i], i])
  }
  return id
}

export async function deletePlan(coachId: string, planId: string) {
  const db = getDB()
  await db.execute('DELETE FROM plans WHERE id = ? AND coach_id = ?', [planId, coachId])
}

// ============== Support Tickets ==============

export async function getTickets(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM support_tickets WHERE coach_id = ? ORDER BY created_at DESC',
    [coachId],
  )
  const tickets = []
  for (const r of result.rows) {
    const msgs = await db.execute('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at', [r.id])
    tickets.push({
      id: r.id, number: r.ticket_number, subject: r.subject, category: r.category, priority: r.priority, status: r.status,
      createdAt: r.created_at, resolvedAt: r.resolved_at || undefined,
      messages: msgs.rows.map(m => ({ id: m.id, author: m.author, body: m.body, imageUrl: m.image_url || '', createdAt: m.created_at })),
    })
  }
  return tickets
}

export async function saveTicket(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = (data.id as string) || generateId()
  const existing = await db.execute('SELECT id FROM support_tickets WHERE id = ? AND coach_id = ?', [id, coachId])
  if (existing.rows.length > 0) {
    await db.execute(
      'UPDATE support_tickets SET subject=?, category=?, priority=?, status=?, resolved_at=? WHERE id=? AND coach_id=?',
      [data.subject, data.category, data.priority, data.status, data.resolvedAt || null, id, coachId],
    )
  } else {
    const maxNum = await db.execute('SELECT COALESCE(MAX(ticket_number),0)+1 as next FROM support_tickets WHERE coach_id=?', [coachId])
    const number = (maxNum.rows[0]?.next as number) || 1
    await db.execute(
      'INSERT INTO support_tickets (id, ticket_number, subject, category, priority, status, coach_id, created_at) VALUES (?,?,?,?,?,?,?,datetime(\'now\'))',
      [id, number, data.subject, data.category, data.priority, data.status, coachId],
    )
  }
  await db.execute('DELETE FROM ticket_messages WHERE ticket_id = ?', [id])
  for (const m of (data.messages as Array<Record<string, unknown>>) || []) {
    await db.execute(
      'INSERT INTO ticket_messages (id, ticket_id, author, body, image_url, created_at) VALUES (?,?,?,?,?,?)',
      [m.id || generateId(), id, m.author, m.body, m.imageUrl || '', m.createdAt || new Date().toISOString()],
    )
  }
  return id
}

// ============== Assigned Workouts ==============

export async function getAssignedWorkouts(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM assigned_workouts WHERE coach_id = ? ORDER BY created_at DESC',
    [coachId],
  )
  return result.rows.map(r => ({
    id: r.id, athleteId: r.athlete_id, athleteName: r.athlete_name,
    contentId: r.content_id, contentType: r.content_type, contentName: r.content_name,
    modality: r.modality, startDate: r.start_date, endDate: r.end_date,
    daysOfWeek: JSON.parse(r.days_of_week as string) as number[],
    status: r.status, progress: r.progress,
  }))
}

export async function saveAssignedWorkout(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = (data.id as string) || generateId()
  // Resolve athleteName if not provided
  let athleteName = (data.athleteName as string | undefined) ?? null
  if (!athleteName && data.athleteId) {
    try {
      const r = await db.execute('SELECT name FROM coach_athletes WHERE id = ? AND coach_id = ? LIMIT 1', [data.athleteId as string, coachId])
      athleteName = (r.rows[0]?.name as string) ?? null
    } catch { /* ignore */ }
  }
  const params = [
    data.athleteId ?? null,
    athleteName,
    data.contentId ?? null,
    data.contentType ?? null,
    data.contentName ?? (data.name as string) ?? null,
    data.modality ?? (data.sportType as string) ?? null,
    data.startDate ?? (data.scheduledDate as string) ?? null,
    data.endDate ?? (data.scheduledDate as string) ?? null,
    JSON.stringify((data.daysOfWeek as unknown[]) || []),
    data.status ?? 'active',
    data.progress ?? 0,
  ]
  const existing = await db.execute('SELECT id FROM assigned_workouts WHERE id = ? AND coach_id = ?', [id, coachId])
  if (existing.rows.length > 0) {
    await db.execute(
      'UPDATE assigned_workouts SET athlete_id=?, athlete_name=?, content_id=?, content_type=?, content_name=?, modality=?, start_date=?, end_date=?, days_of_week=?, status=?, progress=?, updated_at=datetime(\'now\') WHERE id=? AND coach_id=?',
      [...params, id, coachId],
    )
  } else {
    await db.execute(
      'INSERT INTO assigned_workouts (id, athlete_id, athlete_name, content_id, content_type, content_name, modality, start_date, end_date, days_of_week, status, progress, coach_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, ...params, coachId],
    )
  }
  return id
}

export async function deleteAssignedWorkout(coachId: string, workoutId: string) {
  const db = getDB()
  await db.execute('DELETE FROM assigned_workouts WHERE id = ? AND coach_id = ?', [workoutId, coachId])
}

// ============== AI Suggestions ==============

export async function getAISuggestions(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM ai_suggestions WHERE coach_id = ? ORDER BY created_at DESC',
    [coachId],
  )
  return result.rows.map(r => ({
    id: r.id, type: r.type, title: r.title, description: r.description,
    reasoning: r.reasoning, actionLabel: r.action_label,
    dismissed: r.dismissed === 1, applied: r.applied === 1,
  }))
}

export async function saveAISuggestion(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = generateId()
  await db.execute(
    'INSERT INTO ai_suggestions (id, type, title, description, reasoning, action_label, coach_id) VALUES (?,?,?,?,?,?,?)',
    [id, data.type, data.title, data.description, data.reasoning, data.actionLabel, coachId],
  )
  return id
}

// ============== Live Sessions ==============

export async function getLiveSessions(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM live_sessions WHERE coach_id = ? ORDER BY date, start_time',
    [coachId],
  )
  return result.rows.map(r => ({
    id: r.id, title: r.title, description: r.description || '',
    date: r.date, startTime: r.start_time, endTime: r.end_time,
    modality: r.modality, location: r.location || '', notes: r.notes || '',
    public: r.is_public === 1, capacity: r.capacity, enrolled: r.enrolled, status: r.status,
    link: r.link || '', distanceKm: r.distance_km, pace: r.pace || '',
  }))
}

export async function saveLiveSession(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = (data.id as string) || generateId()
  const existing = await db.execute('SELECT id FROM live_sessions WHERE id = ? AND coach_id = ?', [id, coachId])
  if (existing.rows.length > 0) {
    await db.execute(
      'UPDATE live_sessions SET title=?, description=?, date=?, start_time=?, end_time=?, modality=?, location=?, notes=?, is_public=?, capacity=?, enrolled=?, status=?, link=?, distance_km=?, pace=?, updated_at=datetime(\'now\') WHERE id=? AND coach_id=?',
      [data.title, data.description || '', data.date, data.startTime, data.endTime, data.modality, data.location || '', data.notes || '', data.public ? 1 : 0, data.capacity || 0, data.enrolled || 0, data.status, data.link || '', data.distanceKm || null, data.pace || '', id, coachId],
    )
  } else {
    await db.execute(
      'INSERT INTO live_sessions (id, title, description, date, start_time, end_time, modality, location, notes, is_public, capacity, enrolled, status, link, distance_km, pace, coach_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, data.title, data.description || '', data.date, data.startTime, data.endTime, data.modality, data.location || '', data.notes || '', data.public ? 1 : 0, data.capacity || 0, data.enrolled || 0, data.status, data.link || '', data.distanceKm || null, data.pace || '', coachId],
    )
  }
  return id
}

export async function deleteLiveSession(coachId: string, sessionId: string) {
  const db = getDB()
  await db.execute('DELETE FROM live_sessions WHERE id = ? AND coach_id = ?', [sessionId, coachId])
}

// ============== Products ==============

export async function getProducts(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM products WHERE coach_id = ? ORDER BY name',
    [coachId],
  )
  return result.rows.map(r => ({
    id: r.id, name: r.name, brand: r.brand || '', imageUrl: r.image_url || '',
    price: r.price, received: r.received, gross: r.gross,
    stock: r.stock, lowStockThreshold: r.low_stock_threshold, createdAt: r.created_at,
  }))
}

export async function saveProduct(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = (data.id as string) || generateId()
  const existing = await db.execute('SELECT id FROM products WHERE id = ? AND coach_id = ?', [id, coachId])
  if (existing.rows.length > 0) {
    await db.execute(
      'UPDATE products SET name=?, brand=?, image_url=?, price=?, received=?, gross=?, stock=?, low_stock_threshold=?, description=?, category=?, is_shop=?, updated_at=datetime(\'now\') WHERE id=? AND coach_id=?',
      [data.name, data.brand || '', data.imageUrl || '', data.price, data.received, data.gross, data.stock || 0, data.lowStockThreshold || 5, data.description || '', data.category || '', data.isShop ? 1 : 0, id, coachId],
    )
  } else {
    await db.execute(
      'INSERT INTO products (id, name, brand, image_url, price, received, gross, stock, low_stock_threshold, description, category, is_shop, coach_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, data.name, data.brand || '', data.imageUrl || '', data.price, data.received, data.gross, data.stock || 0, data.lowStockThreshold || 5, data.description || '', data.category || '', data.isShop ? 1 : 0, coachId],
    )
  }
  return id
}

export async function deleteProduct(coachId: string, productId: string) {
  const db = getDB()
  await db.execute('DELETE FROM products WHERE id = ? AND coach_id = ?', [productId, coachId])
}

// ============== Sales ==============

export async function getSales(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM sales WHERE coach_id = ? ORDER BY created_at DESC',
    [coachId],
  )
  return result.rows.map(r => ({
    id: r.id, productId: r.product_id, productName: r.product_name, brand: r.brand || '',
    quantity: r.quantity, unitPrice: r.unit_price, unitReceived: r.unit_received,
    total: r.total, date: r.date, createdAt: r.created_at,
  }))
}

export async function saveSale(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = (data.id as string) || generateId()
  await db.execute(
    'INSERT INTO sales (id, product_id, product_name, brand, quantity, unit_price, unit_received, total, date, coach_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [id, data.productId, data.productName, data.brand || '', data.quantity, data.unitPrice, data.unitReceived, data.total, data.date, coachId],
  )
  const product = await db.execute('SELECT stock FROM products WHERE id = ?', [data.productId as string])
  if (product.rows.length > 0) {
    const newStock = Math.max(0, (product.rows[0].stock as number) - (data.quantity as number))
    await db.execute('UPDATE products SET stock = ? WHERE id = ?', [newStock, data.productId])
  }
  return id
}

export async function deleteSale(coachId: string, saleId: string) {
  const db = getDB()
  await db.execute('DELETE FROM sales WHERE id = ? AND coach_id = ?', [saleId, coachId])
}

// ============== Dashboard ==============

export async function getDashboard(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM dashboard_metrics WHERE coach_id = ?',
    [coachId],
  )
  if (result.rows.length === 0) return null
  const d = result.rows[0]
  const revenue = await db.execute('SELECT * FROM revenue_history WHERE coach_id = ? ORDER BY month', [coachId])
  const distribution = await db.execute('SELECT * FROM plan_distribution WHERE coach_id = ?', [coachId])
  const activity = await db.execute('SELECT * FROM recent_activity WHERE coach_id = ? ORDER BY created_at DESC LIMIT 10', [coachId])
  return {
    metrics: {
      monthlyRevenue: d.monthly_revenue, revenueTrend: d.revenue_trend,
      activeAthletes: d.active_athletes, athleteTrend: d.athlete_trend,
      newAthletesThisMonth: d.new_athletes_this_month, newAthleteTrend: d.new_athlete_trend,
      pendingPayments: d.pending_payments, pendingPaymentCount: d.pending_payment_count, overduePaymentCount: d.overdue_payment_count,
      todaySessions: d.today_sessions, todaySessionsCompleted: d.today_sessions_completed, upcomingEvents: d.upcoming_events,
    },
    extra: {
      revenueGoal: d.revenue_goal as number, newAthletesGoal: d.new_athletes_goal as number,
      streakDays: d.streak_days as number, bestStreak: d.best_streak as number,
      planDistribution: distribution.rows.map(p => ({ name: p.plan_name, athletes: p.athletes, revenue: p.revenue, color: p.color })),
      recentActivity: activity.rows.map(a => ({ id: a.id, icon: a.icon, text: a.text, time: a.time })),
    },
    revenueHistory: revenue.rows.map(r => ({ month: r.month, amount: r.amount })),
  }
}

// ============== Payment Methods ==============

export async function getPaymentMethods(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM payment_methods WHERE coach_id = ?',
    [coachId],
  )
  return result.rows.map(r => ({
    id: r.id, bank: r.bank, holder: r.holder,
    accountType: r.account_type, accountNumber: r.account_number,
    clabe: r.clabe, notes: r.notes || '',
  }))
}

export async function savePaymentMethod(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = (data.id as string) || generateId()
  const existing = await db.execute('SELECT id FROM payment_methods WHERE id = ? AND coach_id = ?', [id, coachId])
  if (existing.rows.length > 0) {
    await db.execute(
      'UPDATE payment_methods SET bank=?, holder=?, account_type=?, account_number=?, clabe=?, notes=?, updated_at=datetime(\'now\') WHERE id=? AND coach_id=?',
      [data.bank, data.holder, data.accountType, data.accountNumber, data.clabe, data.notes || '', id, coachId],
    )
  } else {
    await db.execute(
      'INSERT INTO payment_methods (id, coach_id, bank, holder, account_type, account_number, clabe, notes) VALUES (?,?,?,?,?,?,?,?)',
      [id, coachId, data.bank, data.holder, data.accountType, data.accountNumber, data.clabe, data.notes || ''],
    )
  }
  return id
}

export async function deletePaymentMethod(coachId: string, methodId: string) {
  const db = getDB()
  await db.execute('DELETE FROM payment_methods WHERE id = ? AND coach_id = ?', [methodId, coachId])
}

// ============== Public Page Config ==============

export async function getPublicPageConfig(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM public_page_config WHERE coach_id = ?',
    [coachId],
  )
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  return {
    brandName: r.brand_name, tagline: r.tagline || '',
    welcomeMessage: r.welcome_message || '', footerText: r.footer_text,
  }
}

export async function savePublicPageConfig(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = generateId()
  const existing = await db.execute('SELECT id FROM public_page_config WHERE coach_id = ?', [coachId])
  if (existing.rows.length > 0) {
    await db.execute(
      'UPDATE public_page_config SET brand_name=?, tagline=?, welcome_message=?, footer_text=?, updated_at=datetime(\'now\') WHERE coach_id=?',
      [data.brandName, data.tagline || '', data.welcomeMessage || '', data.footerText, coachId],
    )
  } else {
    await db.execute(
      'INSERT INTO public_page_config (id, coach_id, brand_name, tagline, welcome_message, footer_text) VALUES (?,?,?,?,?,?)',
      [id, coachId, data.brandName, data.tagline || '', data.welcomeMessage || '', data.footerText],
    )
  }
}

// ============== Membership & Payments ==============

const GRACE_PERIOD_DAYS = 5

function computePaymentDueDate(periodEnd: string, graceDays: number): string {
  const d = new Date(`${periodEnd}T00:00:00Z`)
  d.setDate(d.getDate() + graceDays)
  return d.toISOString().split('T')[0]
}

function computeMembershipStatus(periodEnd: string, graceDays: number): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(`${periodEnd}T00:00:00Z`)
  const due = new Date(end)
  due.setDate(due.getDate() + graceDays)

  if (today <= end) return 'active'
  if (today <= due) return 'grace_period'
  return 'suspended'
}

export type MembershipStatus = 'active' | 'grace_period' | 'suspended' | 'cancelled'

export type AthleteMembership = {
  id: string
  athleteId: string
  coachId: string
  planId: string | null
  planName: string
  planPrice: number
  billingPeriod: string
  status: MembershipStatus
  currentPeriodStart: string
  currentPeriodEnd: string
  gracePeriodDays: number
  paymentDueDate: string
  polarSubscriptionId: string | null
  polarProductId: string | null
}

export type MembershipPayment = {
  id: string
  membershipId: string
  athleteId: string
  coachId: string
  amount: number
  currency: string
  status: string
  polarOrderId: string | null
  polarInvoiceUrl: string | null
  periodStart: string
  periodEnd: string
  paidAt: string | null
}

function membershipRowToObj(r: Record<string, unknown>): AthleteMembership {
  return {
    id: r.id as string,
    athleteId: r.athlete_id as string,
    coachId: r.coach_id as string,
    planId: r.plan_id as string || null,
    planName: r.plan_name as string,
    planPrice: r.plan_price as number,
    billingPeriod: r.billing_period as string,
    status: r.status as MembershipStatus,
    currentPeriodStart: r.current_period_start as string,
    currentPeriodEnd: r.current_period_end as string,
    gracePeriodDays: r.grace_period_days as number,
    paymentDueDate: r.payment_due_date as string,
    polarSubscriptionId: r.polar_subscription_id as string || null,
    polarProductId: r.polar_product_id as string || null,
  }
}

export async function getAthleteMembership(athleteId: string): Promise<AthleteMembership | null> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM athlete_memberships WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 1',
    [athleteId],
  )
  if (result.rows.length === 0) return null
  const membership = membershipRowToObj(result.rows[0])
  // Recalculate status based on dates
  membership.status = computeMembershipStatus(membership.currentPeriodEnd, membership.gracePeriodDays) as MembershipStatus
  membership.paymentDueDate = computePaymentDueDate(membership.currentPeriodEnd, membership.gracePeriodDays)
  return membership
}

export async function getMembershipById(membershipId: string): Promise<AthleteMembership | null> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM athlete_memberships WHERE id = ? LIMIT 1',
    [membershipId],
  )
  if (result.rows.length === 0) return null
  const membership = membershipRowToObj(result.rows[0])
  membership.status = computeMembershipStatus(membership.currentPeriodEnd, membership.gracePeriodDays) as MembershipStatus
  membership.paymentDueDate = computePaymentDueDate(membership.currentPeriodEnd, membership.gracePeriodDays)
  return membership
}

export async function getAthleteMembershipsByCoach(coachId: string): Promise<AthleteMembership[]> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM athlete_memberships WHERE coach_id = ? ORDER BY current_period_end DESC',
    [coachId],
  )
  return result.rows.map(r => {
    const m = membershipRowToObj(r)
    m.status = computeMembershipStatus(m.currentPeriodEnd, m.gracePeriodDays) as MembershipStatus
    m.paymentDueDate = computePaymentDueDate(m.currentPeriodEnd, m.gracePeriodDays)
    return m
  })
}

export async function createMembership(coachId: string, data: {
  athleteId: string
  planId?: string
  planName: string
  planPrice: number
  billingPeriod?: string
  startDate?: string
}): Promise<string> {
  const db = getDB()
  const id = generateId()
  const billingPeriod = data.billingPeriod || 'monthly'
  const startDate = data.startDate || new Date().toISOString().split('T')[0]
  const periodEnd = new Date(`${startDate}T00:00:00Z`)
  periodEnd.setMonth(periodEnd.getMonth() + (billingPeriod === 'yearly' ? 12 : 1))
  const periodEndStr = periodEnd.toISOString().split('T')[0]
  const graceDays = GRACE_PERIOD_DAYS
  const dueDate = computePaymentDueDate(periodEndStr, graceDays)

  await db.execute(
    `INSERT INTO athlete_memberships (id, athlete_id, coach_id, plan_id, plan_name, plan_price, billing_period, status, current_period_start, current_period_end, grace_period_days, payment_due_date)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, data.athleteId, coachId, data.planId || null, data.planName, data.planPrice, billingPeriod, 'active', startDate, periodEndStr, graceDays, dueDate],
  )
  return id
}

export async function renewMembership(membershipId: string): Promise<void> {
  const db = getDB()
  const result = await db.execute('SELECT * FROM athlete_memberships WHERE id = ?', [membershipId])
  if (result.rows.length === 0) return
  
  const m = result.rows[0]
  const billingPeriod = m.billing_period as string
  const periodStart = m.current_period_end as string
  const periodEnd = new Date(`${periodStart}T00:00:00Z`)
  periodEnd.setMonth(periodEnd.getMonth() + (billingPeriod === 'yearly' ? 12 : 1))
  const periodEndStr = periodEnd.toISOString().split('T')[0]
  const graceDays = (m.grace_period_days as number) || GRACE_PERIOD_DAYS
  const dueDate = computePaymentDueDate(periodEndStr, graceDays)

  await db.execute(
    `UPDATE athlete_memberships SET status='active', current_period_start=?, current_period_end=?, payment_due_date=?, updated_at=datetime('now') WHERE id=?`,
    [periodStart, periodEndStr, dueDate, membershipId],
  )
}

export async function cancelMembership(membershipId: string): Promise<void> {
  const db = getDB()
  await db.execute(
    "UPDATE athlete_memberships SET status='cancelled', updated_at=datetime('now') WHERE id=?",
    [membershipId],
  )
}

export async function getPaymentHistory(athleteId: string): Promise<MembershipPayment[]> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM membership_payments WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 24',
    [athleteId],
  )
  return result.rows.map(r => ({
    id: r.id as string,
    membershipId: r.membership_id as string,
    athleteId: r.athlete_id as string,
    coachId: r.coach_id as string,
    amount: r.amount as number,
    currency: r.currency as string,
    status: r.status as string,
    polarOrderId: r.polar_order_id as string || null,
    polarInvoiceUrl: r.polar_invoice_url as string || null,
    periodStart: r.period_start as string,
    periodEnd: r.period_end as string,
    paidAt: r.paid_at as string || null,
  }))
}

export async function recordPayment(data: {
  membershipId: string
  athleteId: string
  coachId: string
  amount: number
  currency?: string
  status?: string
  polarOrderId?: string
  polarInvoiceUrl?: string
  periodStart: string
  periodEnd: string
  paidAt?: string
}): Promise<string> {
  const db = getDB()

  // Idempotency guard: a duplicate Polar delivery must not double-insert the
  // payment row nor double-extend the membership period. If a payment already
  // exists for this Polar order id, acknowledge it as a no-op.
  if (data.polarOrderId) {
    const existing = await db.execute(
      'SELECT id FROM membership_payments WHERE polar_order_id = ? LIMIT 1',
      [data.polarOrderId],
    )
    if (existing.rows.length > 0) {
      return existing.rows[0].id as string
    }
  }

  const id = generateId()
  await db.execute(
    `INSERT INTO membership_payments (id, membership_id, athlete_id, coach_id, amount, currency, status, polar_order_id, polar_invoice_url, period_start, period_end, paid_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, data.membershipId, data.athleteId, data.coachId, data.amount, data.currency || 'USD', data.status || 'completed', data.polarOrderId || null, data.polarInvoiceUrl || null, data.periodStart, data.periodEnd, data.paidAt || new Date().toISOString()],
  )
  await renewMembership(data.membershipId)
  return id
}

// ============== Appointments & Availability ==============

export type CoachAppointment = {
  id: string
  coachId: string
  athleteId: string
  athleteName: string
  date: string
  startTime: string
  endTime: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  athleteSports: string[]
  athleteModality: string
  athleteLevel: string
  athleteGoal: string
  athleteFrequency: number
  athleteDuration: number
  athleteEquipment: string
  athleteRoutineAccepted: boolean
  notes: string
}

export type CoachAvailability = {
  id: string
  coachId: string
  dayOfWeek: number  // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string
  endTime: string
}

export async function getCoachAppointments(coachId: string): Promise<CoachAppointment[]> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM appointments WHERE coach_id = ? ORDER BY date, start_time',
    [coachId],
  )
  return result.rows.map(r => ({
    id: r.id as string,
    coachId: r.coach_id as string,
    athleteId: r.athlete_id as string,
    athleteName: r.athlete_name as string,
    date: r.date as string,
    startTime: r.start_time as string,
    endTime: r.end_time as string,
    status: r.status as CoachAppointment['status'],
    athleteSports: JSON.parse((r.athlete_sports as string) || '[]'),
    athleteModality: (r.athlete_modality as string) || '',
    athleteLevel: (r.athlete_level as string) || '',
    athleteGoal: (r.athlete_goal as string) || '',
    athleteFrequency: (r.athlete_frequency as number) || 0,
    athleteDuration: (r.athlete_duration as number) || 0,
    athleteEquipment: (r.athlete_equipment as string) || '',
    athleteRoutineAccepted: (r.athlete_routine_accepted as number) === 1,
    notes: (r.notes as string) || '',
  }))
}

export async function getAthleteAppointment(athleteId: string): Promise<CoachAppointment | null> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM appointments WHERE athlete_id = ? AND status != \'cancelled\' ORDER BY created_at DESC LIMIT 1',
    [athleteId],
  )
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  return {
    id: r.id as string, coachId: r.coach_id as string, athleteId: r.athlete_id as string,
    athleteName: r.athlete_name as string, date: r.date as string, startTime: r.start_time as string,
    endTime: r.end_time as string, status: r.status as CoachAppointment['status'],
    athleteSports: JSON.parse((r.athlete_sports as string) || '[]'),
    athleteModality: (r.athlete_modality as string) || '',
    athleteLevel: (r.athlete_level as string) || '',
    athleteGoal: (r.athlete_goal as string) || '',
    athleteFrequency: (r.athlete_frequency as number) || 0,
    athleteDuration: (r.athlete_duration as number) || 0,
    athleteEquipment: (r.athlete_equipment as string) || '',
    athleteRoutineAccepted: (r.athlete_routine_accepted as number) === 1,
    notes: (r.notes as string) || '',
  }
}

export async function createAppointment(data: {
  coachId: string; athleteId: string; athleteName: string;
  date: string; startTime: string; endTime: string;
  athleteSports?: string[]; athleteModality?: string; athleteLevel?: string;
  athleteGoal?: string; athleteFrequency?: number; athleteDuration?: number;
  athleteEquipment?: string; athleteRoutineAccepted?: boolean;
}): Promise<string> {
  const db = getDB()
  const id = generateId()
  await db.execute(
    `INSERT INTO appointments (id, coach_id, athlete_id, athlete_name, date, start_time, end_time, status,
      athlete_sports, athlete_modality, athlete_level, athlete_goal, athlete_frequency, athlete_duration, athlete_equipment, athlete_routine_accepted)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, data.coachId, data.athleteId, data.athleteName, data.date, data.startTime, data.endTime, 'scheduled',
      JSON.stringify(data.athleteSports || []), data.athleteModality || '', data.athleteLevel || '',
      data.athleteGoal || '', data.athleteFrequency || 0, data.athleteDuration || 0,
      data.athleteEquipment || '', data.athleteRoutineAccepted ? 1 : 0],
  )
  await db.execute(
    "UPDATE coach_athletes SET approval_status = 'pending' WHERE id = ?",
    [data.athleteId],
  )
  return id
}

export async function updateAppointment(id: string, data: { status?: string; notes?: string; date?: string; startTime?: string; endTime?: string }): Promise<void> {
  const db = getDB()
  const sets: string[] = []
  const vals: unknown[] = []
  if (data.status) { sets.push('status = ?'); vals.push(data.status); }
  if (data.notes !== undefined) { sets.push('notes = ?'); vals.push(data.notes); }
  if (data.date) { sets.push('date = ?'); vals.push(data.date); }
  if (data.startTime) { sets.push('start_time = ?'); vals.push(data.startTime); }
  if (data.endTime) { sets.push('end_time = ?'); vals.push(data.endTime); }
  sets.push("updated_at = datetime('now')")
  vals.push(id)
  await db.execute(`UPDATE appointments SET ${sets.join(', ')} WHERE id = ?`, vals)

  if (data.status === 'completed') {
    const appt = await db.execute('SELECT athlete_id FROM appointments WHERE id = ?', [id])
    if (appt.rows.length > 0) {
      await db.execute("UPDATE coach_athletes SET approval_status = 'active' WHERE id = ?", [appt.rows[0].athlete_id])
    }
  }
}

export async function getCoachAvailability(coachId: string): Promise<CoachAvailability[]> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM coach_availability WHERE coach_id = ? ORDER BY day_of_week, start_time',
    [coachId],
  )
  return result.rows.map(r => ({
    id: r.id as string, coachId: r.coach_id as string,
    dayOfWeek: r.day_of_week as number, startTime: r.start_time as string, endTime: r.end_time as string,
  }))
}

export async function saveCoachAvailability(coachId: string, slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>): Promise<void> {
  const db = getDB()
  await db.execute('DELETE FROM coach_availability WHERE coach_id = ?', [coachId])
  for (const s of slots) {
    await db.execute(
      'INSERT INTO coach_availability (id, coach_id, day_of_week, start_time, end_time) VALUES (?,?,?,?,?)',
      [generateId(), coachId, s.dayOfWeek, s.startTime, s.endTime],
    )
  }
}

function mapRow(columns: string[]) {
  return (row: Record<string, unknown>) => {
    const obj: Record<string, unknown> = {}
    for (const col of columns) {
      obj[col] = row[col]
    }
    return obj
  }
}

// ============== Blog Posts ==============

export type BlogPost = {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  category: string
  tags: string[]
  imageUrl: string
  isPublished: boolean
  publishedAt: string | null
  coachId: string
  createdAt: string
  updatedAt: string
  readTimeMinutes: number
  views: number
}

export async function getBlogPosts(coachId: string, publishedOnly = false) {
  const db = getDB()
  const query = publishedOnly
    ? 'SELECT * FROM blog_posts WHERE coach_id = ? AND is_published = 1 ORDER BY published_at DESC, created_at DESC'
    : 'SELECT * FROM blog_posts WHERE coach_id = ? ORDER BY created_at DESC'
  const result = await db.execute(query, [coachId])
  const posts: BlogPost[] = []
  for (const r of result.rows) {
    const meta = await db.execute('SELECT * FROM blog_post_meta WHERE post_id = ?', [r.id as string])
    posts.push({
      id: r.id as string,
      slug: r.slug as string,
      title: r.title as string,
      excerpt: r.excerpt as string,
      content: r.content as string,
      category: r.category as string,
      tags: r.tags ? JSON.parse(r.tags as string) : [],
      imageUrl: r.image_url as string,
      isPublished: r.is_published === 1,
      publishedAt: r.published_at as string,
      coachId: r.coach_id as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
      readTimeMinutes: (meta.rows[0]?.read_time_minutes as number) || 5,
      views: (meta.rows[0]?.views as number) || 0,
    })
  }
  return posts
}

export async function getBlogPostBySlug(coachId: string, slug: string) {
  const db = getDB()
  const result = await db.execute('SELECT * FROM blog_posts WHERE coach_id = ? AND slug = ?', [coachId, slug])
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  const meta = await db.execute('SELECT * FROM blog_post_meta WHERE post_id = ?', [r.id as string])
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    excerpt: r.excerpt as string,
    content: r.content as string,
    category: r.category as string,
    tags: r.tags ? JSON.parse(r.tags as string) : [],
    imageUrl: r.image_url as string,
    isPublished: r.is_published === 1,
    publishedAt: r.published_at as string,
    coachId: r.coach_id as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    readTimeMinutes: (meta.rows[0]?.read_time_minutes as number) || 5,
    views: (meta.rows[0]?.views as number) || 0,
  } as BlogPost
}

export async function saveBlogPost(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = (data.id as string) || generateId()
  const tags = JSON.stringify(data.tags || [])
  const existing = await db.execute('SELECT id FROM blog_posts WHERE id = ? AND coach_id = ?', [id, coachId])
  if (existing.rows.length > 0) {
    await db.execute(
      'UPDATE blog_posts SET slug=?, title=?, excerpt=?, content=?, category=?, tags=?, image_url=?, is_published=?, published_at=?, updated_at=datetime(\'now\') WHERE id=? AND coach_id=?',
      [data.slug, data.title, data.excerpt, data.content, data.category, tags, data.imageUrl, data.isPublished ? 1 : 0, data.publishedAt || null, id, coachId],
    )
  } else {
    await db.execute(
      'INSERT INTO blog_posts (id, slug, title, excerpt, content, category, tags, image_url, is_published, published_at, coach_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [id, data.slug, data.title, data.excerpt, data.content, data.category, tags, data.imageUrl, data.isPublished ? 1 : 0, data.publishedAt || null, coachId],
    )
  }
  await db.execute(
    'INSERT OR REPLACE INTO blog_post_meta (post_id, read_time_minutes, views) VALUES (?, ?, ?)',
    [id, data.readTimeMinutes || 5, data.views || 0],
  )
  return id
}

export async function deleteBlogPost(coachId: string, postId: string) {
  const db = getDB()
  await db.execute('DELETE FROM blog_posts WHERE id = ? AND coach_id = ?', [postId, coachId])
}

export async function incrementBlogView(coachId: string, slug: string) {
  const db = getDB()
  const result = await db.execute('SELECT id FROM blog_posts WHERE slug = ? AND coach_id = ? AND is_published = 1', [slug, coachId])
  if (result.rows.length === 0) return
  const postId = result.rows[0].id as string
  await db.execute(
    'INSERT OR IGNORE INTO blog_post_meta (post_id, read_time_minutes, views) VALUES (?, 5, 0)',
    [postId],
  )
  await db.execute('UPDATE blog_post_meta SET views = views + 1 WHERE post_id = ?', [postId])
}

export async function getPublicBlogPosts(coachSlug: string) {
  const coachId = coachSlug === 'default' ? 'default' : coachSlug
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM blog_posts WHERE coach_id = ? AND is_published = 1 ORDER BY published_at DESC, created_at DESC',
    [coachId],
  )
  const posts: BlogPost[] = []
  for (const r of result.rows) {
    const meta = await db.execute('SELECT * FROM blog_post_meta WHERE post_id = ?', [r.id as string])
    posts.push({
      id: r.id as string,
      slug: r.slug as string,
      title: r.title as string,
      excerpt: r.excerpt as string,
      content: r.content as string,
      category: r.category as string,
      tags: r.tags ? JSON.parse(r.tags as string) : [],
      imageUrl: r.image_url as string,
      isPublished: r.is_published === 1,
      publishedAt: r.published_at as string,
      coachId: r.coach_id as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
      readTimeMinutes: (meta.rows[0]?.read_time_minutes as number) || 5,
      views: (meta.rows[0]?.views as number) || 0,
    })
  }
  return posts
}

export async function getPublicBlogPostBySlug(coachSlug: string, slug: string) {
  const coachId = coachSlug === 'default' ? 'default' : coachSlug
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM blog_posts WHERE coach_id = ? AND slug = ? AND is_published = 1',
    [coachId, slug],
  )
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  const meta = await db.execute('SELECT * FROM blog_post_meta WHERE post_id = ?', [r.id as string])
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    excerpt: r.excerpt as string,
    content: r.content as string,
    category: r.category as string,
    tags: r.tags ? JSON.parse(r.tags as string) : [],
    imageUrl: r.image_url as string,
    isPublished: r.is_published === 1,
    publishedAt: r.published_at as string,
    coachId: r.coach_id as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    readTimeMinutes: (meta.rows[0]?.read_time_minutes as number) || 5,
    views: (meta.rows[0]?.views as number) || 0,
  }
}

export async function getAllPublicBlogPosts() {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM blog_posts WHERE is_published = 1 ORDER BY published_at DESC, created_at DESC',
  )
  const posts: BlogPost[] = []
  for (const r of result.rows) {
    const meta = await db.execute('SELECT * FROM blog_post_meta WHERE post_id = ?', [r.id as string])
    posts.push({
      id: r.id as string,
      slug: r.slug as string,
      title: r.title as string,
      excerpt: r.excerpt as string,
      content: r.content as string,
      category: r.category as string,
      tags: r.tags ? JSON.parse(r.tags as string) : [],
      imageUrl: r.image_url as string,
      isPublished: r.is_published === 1,
      publishedAt: r.published_at as string,
      coachId: r.coach_id as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
      readTimeMinutes: (meta.rows[0]?.read_time_minutes as number) || 5,
      views: (meta.rows[0]?.views as number) || 0,
    })
  }
  return posts
}

export async function getAllPublicBlogPostBySlug(slug: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM blog_posts WHERE slug = ? AND is_published = 1',
    [slug],
  )
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  const meta = await db.execute('SELECT * FROM blog_post_meta WHERE post_id = ?', [r.id as string])
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    excerpt: r.excerpt as string,
    content: r.content as string,
    category: r.category as string,
    tags: r.tags ? JSON.parse(r.tags as string) : [],
    imageUrl: r.image_url as string,
    isPublished: r.is_published === 1,
    publishedAt: r.published_at as string,
    coachId: r.coach_id as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    readTimeMinutes: (meta.rows[0]?.read_time_minutes as number) || 5,
    views: (meta.rows[0]?.views as number) || 0,
  }
}

// ============== Public Store Products ==============

export async function getPublicProducts(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM products WHERE coach_id = ? AND is_shop = 1 AND stock > 0 ORDER BY name',
    [coachId],
  )
  return result.rows.map(r => ({
    id: r.id, name: r.name, brand: r.brand || '', imageUrl: r.image_url || '',
    price: r.price, description: r.description || '', category: r.category || '',
    stock: r.stock, createdAt: r.created_at,
  }))
}

export async function getAllPublicProducts() {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM products WHERE is_shop = 1 AND stock > 0 ORDER BY name',
  )
  return result.rows.map(r => ({
    id: r.id, name: r.name, brand: r.brand || '', imageUrl: r.image_url || '',
    price: r.price, description: r.description || '', category: r.category || '',
    stock: r.stock, createdAt: r.created_at,
  }))
}

// ============== Public Plans ==============

export async function getPublicPlans(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM plans WHERE coach_id = ? AND is_active = 1 ORDER BY price',
    [coachId],
  )
  const plans = []
  for (const r of result.rows) {
    const modes = await db.execute('SELECT mode FROM plan_training_modes WHERE plan_id = ?', [r.id])
    const features = await db.execute('SELECT feature FROM plan_features WHERE plan_id = ? ORDER BY sort_order', [r.id])
    const plan: Record<string, unknown> = {
      id: r.id, name: r.name, description: r.description, price: r.price, currency: r.currency, billingPeriod: r.billing_period,
      trainingMode: modes.rows.map(m => m.mode as string),
      maxAthletes: r.max_athletes, maxSessionsPerWeek: r.max_sessions_per_week,
      features: features.rows.map(f => f.feature as string),
      isActive: r.is_active === 1, athleteCount: r.athlete_count,
    }
    if (r.discount_type) {
      plan.discount = { type: r.discount_type, value: r.discount_value, label: r.discount_label, validFrom: r.discount_valid_from, validUntil: r.discount_valid_until, code: r.discount_code }
    }
    plans.push(plan)
  }
  return plans
}

export async function getAllPublicPlans() {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM plans WHERE is_active = 1 ORDER BY price',
  )
  const plans = []
  for (const r of result.rows) {
    const modes = await db.execute('SELECT mode FROM plan_training_modes WHERE plan_id = ?', [r.id])
    const features = await db.execute('SELECT feature FROM plan_features WHERE plan_id = ? ORDER BY sort_order', [r.id])
    const plan: Record<string, unknown> = {
      id: r.id, name: r.name, description: r.description, price: r.price, currency: r.currency, billingPeriod: r.billing_period,
      trainingMode: modes.rows.map(m => m.mode as string),
      maxAthletes: r.max_athletes, maxSessionsPerWeek: r.max_sessions_per_week,
      features: features.rows.map(f => f.feature as string),
      isActive: r.is_active === 1, athleteCount: r.athlete_count,
    }
    if (r.discount_type) {
      plan.discount = { type: r.discount_type, value: r.discount_value, label: r.discount_label, validFrom: r.discount_valid_from, validUntil: r.discount_valid_until, code: r.discount_code }
    }
    plans.push(plan)
  }
  return plans
}


// ============== Athlete-Scoped Queries (for mobile app) ==============

export async function getAthleteByClerkId(clerkUserId: string) {
  const db = getDB()
  let result = await db.execute(
    'SELECT * FROM coach_athletes WHERE id = ? LIMIT 1',
    [clerkUserId],
  )
  if (result.rows.length === 0) {
    result = await db.execute(
      `SELECT ca.* FROM coach_athletes ca
       INNER JOIN users u ON ca.email = u.email
       WHERE u.id = ? LIMIT 1`,
      [clerkUserId],
    )
  }
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  return {
    id: r.id as string,
    name: r.name as string,
    sport: r.sport as string,
    email: r.email as string || '',
    phone: r.phone as string || '',
    coachId: r.coach_id as string,
    serviceType: r.service_type as string || '',
    plan: { name: r.plan_name as string || '', price: r.plan_price as number || 0, billingPeriod: r.plan_billing as string || 'monthly' },
    schedule: { days: r.schedule_days as string || '', time: r.schedule_time as string || '' },
    startDate: r.start_date as string || '',
    readiness: { sleep: r.sleep as number || 0, hrv: r.hrv as number || 0, recovery: r.recovery as number || 0, score: r.readiness_score as number || 0 },
  }
}

export async function getAthleteAssignedWorkouts(athleteId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM assigned_workouts WHERE athlete_id = ? ORDER BY created_at DESC',
    [athleteId],
  )
  return result.rows.map(r => ({
    id: r.id as string,
    athleteId: r.athlete_id as string,
    contentName: r.content_name as string,
    contentType: r.content_type as string,
    modality: r.modality as string,
    startDate: r.start_date as string,
    endDate: r.end_date as string,
    daysOfWeek: JSON.parse(r.days_of_week as string || '[]') as number[],
    status: r.status as string,
    progress: r.progress as number || 0,
  }))
}

export async function getAthleteSessions(athleteId: string) {
  const db = getDB()
  const result = await db.execute(
    `SELECT cs.* FROM coach_sessions cs
     INNER JOIN session_athletes sa ON cs.id = sa.session_id
     WHERE sa.athlete_id = ?
     ORDER BY cs.time`,
    [athleteId],
  )
  return result.rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    time: r.time as string,
    endTime: r.end_time as string,
    location: r.location as string,
    status: r.status as string,
  }))
}

export async function getAthleteAppointments(athleteId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM appointments WHERE athlete_id = ? ORDER BY date DESC, start_time DESC',
    [athleteId],
  )
  return result.rows.map(r => ({
    id: r.id as string,
    coachId: r.coach_id as string,
    athleteId: r.athlete_id as string,
    athleteName: r.athlete_name as string,
    date: r.date as string,
    startTime: r.start_time as string,
    endTime: r.end_time as string,
    status: r.status as string,
    notes: (r.notes as string) || '',
  }))
}

export async function getCoachAvailabilityForAthlete(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM coach_availability WHERE coach_id = ? ORDER BY day_of_week, start_time',
    [coachId],
  )
  return result.rows.map(r => ({
    id: r.id as string,
    dayOfWeek: r.day_of_week as number,
    startTime: r.start_time as string,
    endTime: r.end_time as string,
  }))
}

export async function createAthleteAppointment(data: {
  coachId: string; athleteId: string; athleteName: string;
  date: string; startTime: string; endTime: string;
  notes?: string;
}): Promise<string> {
  const db = getDB()
  const id = generateId()
  await db.execute(
    `INSERT INTO appointments (id, coach_id, athlete_id, athlete_name, date, start_time, end_time, status, notes)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, data.coachId, data.athleteId, data.athleteName, data.date, data.startTime, data.endTime, 'scheduled', data.notes || ''],
  )
  return id
}

// ============== Workout Templates & Session Logs ==============

export type WorkoutExercise = {
  id: string
  workoutId: string
  name: string
  sets: number
  reps: number
  weightKg: number | null
  restSeconds: number | null
  sortOrder: number
  notes: string | null
  // Training-intelligence fields (migration 010). Legacy rows fall back to defaults.
  mode: 'reps' | 'time' | 'cardio'
  phase: 'work' | 'warmup'
  supersetGroup: string | null
  repsMin: number | null
  repsMax: number | null
  prog: 'off' | 'linear' | 'greyskull' | 'double' | 'time' | null
  inc: number | null
  sec: number | null
  minutes: number | null
  speed: number | null
  perSide: boolean
  bodyPart: string | null
  muscleGroups: string[]
  libraryExerciseId: string | null
}

export type WorkoutSession = {
  id: string
  workoutId: string
  athleteId: string
  startedAt: string
  completed: number
  completedAt: string | null
  currentExerciseIndex: number
  durationSeconds: number
}

export type WorkoutSetLog = {
  id: string
  sessionId: string
  exerciseId: string
  setIndex: number
  weightKg: number | null
  reps: number | null
  completed: number
  loggedAt: string
  // Training-intelligence fields (migration 010). Legacy rows leave these undefined.
  phase?: 'work' | 'warmup' | null
  rir?: number | null
  rpe?: number | null
  sec?: number | null
  minutes?: number | null
  speed?: number | null
  skipped?: boolean
}

export type SetLogExtra = {
  phase?: 'work' | 'warmup' | null
  rir?: number | null
  rpe?: number | null
  sec?: number | null
  minutes?: number | null
  speed?: number | null
  skipped?: boolean
}

function mapWorkoutSession(r: Record<string, unknown>): WorkoutSession {
  return {
    id: r.id as string,
    workoutId: r.workout_id as string,
    athleteId: r.athlete_id as string,
    startedAt: r.started_at as string,
    completed: r.completed as number,
    completedAt: r.completed_at as string | null,
    currentExerciseIndex: r.current_exercise_index as number,
    durationSeconds: r.duration_seconds as number,
  }
}

export async function getWorkoutDetail(workoutId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM assigned_workouts WHERE id = ?',
    [workoutId],
  )
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  const workout = {
    id: r.id as string,
    athleteId: r.athlete_id as string,
    athleteName: r.athlete_name as string || '',
    contentId: r.content_id as string,
    contentType: r.content_type as string,
    contentName: r.content_name as string,
    modality: r.modality as string,
    startDate: r.start_date as string,
    endDate: r.end_date as string,
    daysOfWeek: JSON.parse(r.days_of_week as string || '[]') as number[],
    status: r.status as string,
    progress: r.progress as number || 0,
    coachId: r.coach_id as string,
  }
  const exercisesResult = await db.execute(
    'SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY sort_order',
    [workoutId],
  )
  const exercises: WorkoutExercise[] = exercisesResult.rows.map(e => ({
    id: e.id as string,
    workoutId: e.workout_id as string,
    name: e.name as string,
    sets: e.sets as number,
    reps: e.reps as number,
    weightKg: e.weight_kg as number | null,
    restSeconds: e.rest_seconds as number | null,
    sortOrder: e.sort_order as number,
    notes: e.notes as string | null,
    mode: (e.mode as 'reps' | 'time' | 'cardio') || 'reps',
    phase: (e.phase as 'work' | 'warmup') || 'work',
    supersetGroup: (e.superset_group as string) || null,
    repsMin: (e.reps_min as number) ?? null,
    repsMax: (e.reps_max as number) ?? null,
    prog: (e.prog as WorkoutExercise['prog']) ?? null,
    inc: (e.inc as number) ?? null,
    sec: (e.sec as number) ?? null,
    minutes: (e.minutes as number) ?? null,
    speed: (e.speed as number) ?? null,
    perSide: e.per_side === 1 || e.per_side === true,
    bodyPart: (e.body_part as string) || null,
    muscleGroups: String(e.muscle_groups || '').split(',').map(s => s.trim()).filter(Boolean),
    libraryExerciseId: (e.library_exercise_id as string) || null,
  }))
  return { workout, exercises }
}

export async function getActiveWorkoutSession(workoutId: string, athleteId: string): Promise<WorkoutSession | null> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM workout_session_logs WHERE workout_id = ? AND athlete_id = ? AND completed = 0 ORDER BY started_at DESC LIMIT 1',
    [workoutId, athleteId],
  )
  if (result.rows.length === 0) return null
  return mapWorkoutSession(result.rows[0])
}

export async function createWorkoutSession(workoutId: string, athleteId: string): Promise<WorkoutSession> {
  const db = getDB()
  const id = generateId()
  const now = new Date().toISOString()
  await db.execute(
    'INSERT INTO workout_session_logs (id, workout_id, athlete_id, started_at, completed, current_exercise_index, duration_seconds) VALUES (?,?,?,?,0,0,0)',
    [id, workoutId, athleteId, now],
  )
  return { id, workoutId, athleteId, startedAt: now, completed: 0, completedAt: null, currentExerciseIndex: 0, durationSeconds: 0 }
}

export async function getWorkoutSession(sessionId: string): Promise<WorkoutSession | null> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM workout_session_logs WHERE id = ?',
    [sessionId],
  )
  if (result.rows.length === 0) return null
  return mapWorkoutSession(result.rows[0])
}

export async function updateWorkoutSessionProgress(sessionId: string, currentExerciseIndex: number, durationSeconds: number) {
  const db = getDB()
  await db.execute(
    'UPDATE workout_session_logs SET current_exercise_index = ?, duration_seconds = ? WHERE id = ?',
    [currentExerciseIndex, durationSeconds, sessionId],
  )
}

export async function logWorkoutSet(
  sessionId: string,
  exerciseId: string,
  setIndex: number,
  weightKg: number | null,
  reps: number | null,
  extra: SetLogExtra = {},
): Promise<WorkoutSetLog> {
  const db = getDB()
  const id = generateId()
  const now = new Date().toISOString()
  await db.execute(
    `INSERT INTO workout_set_logs
       (id, session_id, exercise_id, set_index, weight_kg, reps, completed, logged_at,
        phase, rir, rpe, sec, minutes, speed, skipped)
     VALUES (?,?,?,?,?,?,1,?,?,?,?,?,?,?,?)`,
    [
      id, sessionId, exerciseId, setIndex, weightKg, reps, now,
      extra.phase ?? null, extra.rir ?? null, extra.rpe ?? null,
      extra.sec ?? null, extra.minutes ?? null, extra.speed ?? null,
      extra.skipped ? 1 : 0,
    ],
  )
  return {
    id, sessionId, exerciseId, setIndex, weightKg, reps, completed: 1, loggedAt: now,
    phase: extra.phase ?? null, rir: extra.rir ?? null, rpe: extra.rpe ?? null,
    sec: extra.sec ?? null, minutes: extra.minutes ?? null, speed: extra.speed ?? null,
    skipped: !!extra.skipped,
  }
}

export function mapWorkoutSetLog(r: Record<string, unknown>): WorkoutSetLog {
  return {
    id: r.id as string,
    sessionId: r.session_id as string,
    exerciseId: r.exercise_id as string,
    setIndex: r.set_index as number,
    weightKg: (r.weight_kg as number) ?? null,
    reps: (r.reps as number) ?? null,
    completed: r.completed as number,
    loggedAt: r.logged_at as string,
    phase: (r.phase as 'work' | 'warmup') || null,
    rir: (r.rir as number) ?? null,
    rpe: (r.rpe as number) ?? null,
    sec: (r.sec as number) ?? null,
    minutes: (r.minutes as number) ?? null,
    speed: (r.speed as number) ?? null,
    skipped: r.skipped === 1 || r.skipped === true,
  }
}

/** Every set log in one session, ordered by exercise then set. */
export async function listSessionSetLogs(sessionId: string): Promise<WorkoutSetLog[]> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM workout_set_logs WHERE session_id = ? ORDER BY exercise_id, set_index',
    [sessionId],
  )
  return result.rows.map(mapWorkoutSetLog)
}

export async function completeWorkoutSession(sessionId: string) {
  const db = getDB()
  const now = new Date().toISOString()
  const result = await db.execute(
    'SELECT workout_id FROM workout_session_logs WHERE id = ?',
    [sessionId],
  )
  if (result.rows.length > 0) {
    const workoutId = result.rows[0].workout_id as string
    await db.execute('UPDATE assigned_workouts SET progress = 100 WHERE id = ?', [workoutId])
  }
  await db.execute('UPDATE workout_session_logs SET completed = 1, completed_at = ? WHERE id = ?', [now, sessionId])
}

// ============== Exercise Library (migration 011/012) ==============

export type ExerciseLibraryItem = {
  id: string
  slug: string
  name: string
  description: string
  mode: 'reps' | 'time' | 'cardio'
  bodyPart: string | null
  muscleGroups: string[]
  secondaryMuscles: string[]
  equipment: string | null
  difficulty: string | null
  category: string | null
  instructions: string[]
  defaultSec: number | null
  videoUrl: string | null
  isCustom: boolean
  coachId: string | null
}

function mapExerciseLibraryItem(r: Record<string, unknown>): ExerciseLibraryItem {
  const splitCsv = (v: unknown) => String(v || '').split(',').map(s => s.trim()).filter(Boolean)
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    description: (r.description as string) || '',
    mode: (r.mode as 'reps' | 'time' | 'cardio') || 'reps',
    bodyPart: (r.body_part as string) || null,
    muscleGroups: splitCsv(r.muscle_groups),
    secondaryMuscles: splitCsv(r.secondary_muscles),
    equipment: (r.equipment as string) || null,
    difficulty: (r.difficulty as string) || null,
    category: (r.category as string) || null,
    instructions: String(r.instructions || '').split('\n').map(s => s.trim()).filter(Boolean),
    defaultSec: (r.default_sec as number) ?? null,
    videoUrl: (r.video_url as string) || null,
    isCustom: r.is_custom === 1 || r.is_custom === true,
    coachId: (r.coach_id as string) || null,
  }
}

/** Global library plus this coach's custom exercises. */
export async function listExerciseLibrary(coachId?: string): Promise<ExerciseLibraryItem[]> {
  const db = getDB()
  const rows = coachId
    ? await db.execute('SELECT * FROM exercise_library WHERE coach_id IS NULL OR coach_id = ? ORDER BY name', [coachId])
    : await db.execute('SELECT * FROM exercise_library WHERE coach_id IS NULL ORDER BY name')
  return rows.rows.map(mapExerciseLibraryItem)
}

export async function getExerciseBySlug(slug: string): Promise<ExerciseLibraryItem | null> {
  const db = getDB()
  const result = await db.execute('SELECT * FROM exercise_library WHERE slug = ? LIMIT 1', [slug])
  if (result.rows.length === 0) return null
  return mapExerciseLibraryItem(result.rows[0])
}

/** Match a set of incoming names against the library (case-insensitive, trimmed). */
export async function findExercisesByNames(names: string[]): Promise<Map<string, ExerciseLibraryItem>> {
  const out = new Map<string, ExerciseLibraryItem>()
  const wanted = [...new Set(names.map(n => n.trim().toLowerCase()).filter(Boolean))]
  if (wanted.length === 0) return out
  for (const name of wanted) {
    const result = await db.execute(
      'SELECT * FROM exercise_library WHERE LOWER(name) = ? LIMIT 1',
      [name],
    )
    if (result.rows.length > 0) {
      const item = mapExerciseLibraryItem(result.rows[0])
      // Keyed by the lower-cased requested name so callers can resolve their input.
      out.set(name, item)
    }
  }
  return out
}

export async function createCustomExercise(coachId: string, data: {
  name: string; description?: string; mode?: 'reps' | 'time' | 'cardio';
  bodyPart?: string; muscleGroups?: string[]; equipment?: string;
  difficulty?: string; category?: string; instructions?: string[]; defaultSec?: number;
}): Promise<ExerciseLibraryItem> {
  const db = getDB()
  const id = generateId()
  const baseSlug = data.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'exercise'
  const slug = `${baseSlug}-${id.slice(0, 8)}`
  await db.execute(
    `INSERT INTO exercise_library
       (id, slug, name, description, mode, body_part, muscle_groups, secondary_muscles,
        equipment, difficulty, category, instructions, default_sec, is_custom, coach_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)`,
    [
      id, slug, data.name.trim(), data.description ?? '', data.mode ?? 'reps',
      data.bodyPart ?? null, (data.muscleGroups ?? []).join(','), '',
      data.equipment ?? null, data.difficulty ?? null, data.category ?? null,
      (data.instructions ?? []).join('\n'), data.defaultSec ?? null, coachId,
    ],
  )
  const created = await db.execute('SELECT * FROM exercise_library WHERE id = ?', [id])
  return mapExerciseLibraryItem(created.rows[0])
}

/**
 * Replace the full exercise list of an assigned workout. Delete-then-insert keeps
 * sort_order authoritative; call only before athletes have logged sessions.
 * Returns the created rows (with their generated ids) so callers can link set logs.
 */
export async function saveWorkoutExercises(workoutId: string, items: Array<{
  name: string; sets: number; reps: number; weightKg?: number | null; restSeconds?: number | null;
  notes?: string | null; sortOrder: number;
  mode?: 'reps' | 'time' | 'cardio'; phase?: 'work' | 'warmup'; supersetGroup?: string | null;
  repsMin?: number | null; repsMax?: number | null; prog?: WorkoutExercise['prog'];
  inc?: number | null; sec?: number | null; minutes?: number | null; speed?: number | null;
  perSide?: boolean; bodyPart?: string | null; muscleGroups?: string[];
  libraryExerciseId?: string | null;
}>): Promise<Array<{ id: string; name: string }>> {
  const db = getDB()
  await db.execute('DELETE FROM workout_exercises WHERE workout_id = ?', [workoutId])
  const created: Array<{ id: string; name: string }> = []
  for (const it of items) {
    const id = generateId()
    await db.execute(
      `INSERT INTO workout_exercises
         (id, workout_id, name, sets, reps, weight_kg, rest_seconds, sort_order, notes,
          mode, phase, superset_group, reps_min, reps_max, prog, inc, sec, minutes, speed,
          per_side, body_part, muscle_groups, library_exercise_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, workoutId, it.name, it.sets, it.reps,
        it.weightKg ?? null, it.restSeconds ?? null, it.sortOrder, it.notes ?? null,
        it.mode ?? 'reps', it.phase ?? 'work', it.supersetGroup ?? null,
        it.repsMin ?? null, it.repsMax ?? null, it.prog ?? null, it.inc ?? null,
        it.sec ?? null, it.minutes ?? null, it.speed ?? null,
        it.perSide ? 1 : 0, it.bodyPart ?? null, (it.muscleGroups ?? []).join(','),
        it.libraryExerciseId ?? null,
      ],
    )
    created.push({ id, name: it.name })
  }
  return created
}

// ============== Athlete Training History (training intelligence) ==============

export type EngineSet = {
  completed?: boolean | number
  skipped?: boolean | number
  phase?: 'work' | 'warmup' | null
  weightKg?: number | null
  reps?: number | null
  sec?: number | null
  minutes?: number | null
  speed?: number | null
  rir?: number | null
  rpe?: number | null
}

export type AthleteExerciseMeta = {
  key: string
  name: string
  libraryExerciseId: string | null
  muscleGroups: string[]
  bodyPart: string | null
  mode: 'reps' | 'time' | 'cardio'
}

export type AthleteTrainingHistory = {
  /** Engine-shaped history, oldest first. Entry ids are stable exercise keys. */
  history: Array<{
    date: string
    startedAt: number
    workoutName: string
    entries: Array<{ id: string; target: Record<string, unknown>; sets: EngineSet[] }>
  }>
  /** Identity metadata per exercise key (for labels in coach views). */
  exerciseMeta: Record<string, AthleteExerciseMeta>
}

function exerciseKey(libraryExerciseId: unknown, name: unknown): string {
  if (libraryExerciseId) return String(libraryExerciseId)
  return String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

/**
 * Completed sessions of one athlete shaped for the training engine.
 * Exercises are grouped by library id when present, else by normalized name, so the same
 * lift keeps one identity across different assigned workouts — that is what makes
 * progression / 1RM / fatigue derivable from history at all.
 */
export async function getAthleteTrainingHistory(athleteId: string): Promise<AthleteTrainingHistory> {
  const db = getDB()
  const result = await db.execute(
    `SELECT s.id AS session_id, s.started_at, w.content_name,
            we.name AS exercise_name, we.library_exercise_id, we.muscle_groups,
            we.body_part, we.mode AS ex_mode, we.sets AS target_sets,
            we.reps AS target_reps, we.sec AS target_sec, we.weight_kg AS target_weight_kg,
            sl.set_index, sl.weight_kg, sl.reps, sl.completed, sl.phase, sl.rir, sl.rpe,
            sl.sec, sl.minutes, sl.speed, sl.skipped
     FROM workout_set_logs sl
     JOIN workout_session_logs s ON sl.session_id = s.id
     JOIN assigned_workouts w ON s.workout_id = w.id
     JOIN workout_exercises we ON sl.exercise_id = we.id
     WHERE s.athlete_id = ? AND s.completed = 1
     ORDER BY s.started_at ASC, sl.logged_at ASC`,
    [athleteId],
  )

  const sessions = new Map<string, AthleteTrainingHistory['history'][number]>()
  const entryIndex = new Map<string, Map<string, AthleteTrainingHistory['history'][number]['entries'][number]>>()
  const exerciseMeta: Record<string, AthleteExerciseMeta> = {}

  for (const r of result.rows) {
    const sid = r.session_id as string
    let session = sessions.get(sid)
    if (!session) {
      const startedAt = Date.parse(r.started_at as string)
      session = {
        date: new Date(Number.isFinite(startedAt) ? startedAt : Date.now()).toISOString().slice(0, 10),
        startedAt,
        workoutName: (r.content_name as string) || '',
        entries: [],
      }
      sessions.set(sid, session)
      entryIndex.set(sid, new Map())
    }

    const key = exerciseKey(r.library_exercise_id, r.exercise_name)
    const perSession = entryIndex.get(sid)!
    let entry = perSession.get(key)
    if (!entry) {
      entry = {
        id: key,
        target: {
          sets: (r.target_sets as number) ?? undefined,
          reps: (r.target_reps as number) ?? undefined,
          sec: (r.target_sec as number) ?? undefined,
          weightKg: (r.target_weight_kg as number) ?? undefined,
          mode: (r.ex_mode as string) || undefined,
          muscleGroups: String(r.muscle_groups || '').split(',').map(s => s.trim()).filter(Boolean),
          bodyPart: (r.body_part as string) || undefined,
        },
        sets: [],
      }
      perSession.set(key, entry)
      session.entries.push(entry)

      if (!exerciseMeta[key]) {
        exerciseMeta[key] = {
          key,
          name: (r.exercise_name as string) || key,
          libraryExerciseId: (r.library_exercise_id as string) || null,
          muscleGroups: String(r.muscle_groups || '').split(',').map(s => s.trim()).filter(Boolean),
          bodyPart: (r.body_part as string) || null,
          mode: ((r.ex_mode as string) || 'reps') as AthleteExerciseMeta['mode'],
        }
      }
    }

    entry.sets.push({
      setIndex: r.set_index as number,
      completed: r.completed as number,
      skipped: r.skipped as number,
      phase: (r.phase as string) || null,
      weightKg: (r.weight_kg as number) ?? null,
      reps: (r.reps as number) ?? null,
      rir: (r.rir as number) ?? null,
      rpe: (r.rpe as number) ?? null,
      sec: (r.sec as number) ?? null,
      minutes: (r.minutes as number) ?? null,
      speed: (r.speed as number) ?? null,
    } as EngineSet & { setIndex: number })
  }

  return { history: [...sessions.values()], exerciseMeta }
}

// ============== Athlete Health Metrics (wearables, migration 013) ==============

export type HealthPlatform = 'healthkit' | 'healthconnect' | 'garmin'

export type HealthDevice = {
  id: string
  athleteId: string
  platform: HealthPlatform
  deviceName: string
  deviceBrand: string
  isActive: boolean
  lastSyncAt: string | null
}

function mapHealthDevice(r: Record<string, unknown>): HealthDevice {
  return {
    id: r.id as string,
    athleteId: r.athlete_id as string,
    platform: r.platform as HealthPlatform,
    deviceName: (r.device_name as string) || '',
    deviceBrand: (r.device_brand as string) || '',
    isActive: r.is_active === 1 || r.is_active === true,
    lastSyncAt: (r.last_sync_at as string) || null,
  }
}

/** Register a device after native permissions are granted; one row per platform. */
export async function upsertHealthDevice(
  athleteId: string,
  data: { platform: HealthPlatform; deviceName?: string; deviceBrand?: string },
): Promise<HealthDevice> {
  const db = getDB()
  await db.execute(
    `INSERT INTO athlete_health_devices (id, athlete_id, platform, device_name, device_brand, is_active)
     VALUES (?,?,?,?,?,1)
     ON CONFLICT(athlete_id, platform) DO UPDATE SET
       device_name = excluded.device_name,
       device_brand = excluded.device_brand,
       is_active = 1`,
    [generateId(), athleteId, data.platform, data.deviceName ?? '', data.deviceBrand ?? ''],
  )
  const result = await db.execute(
    'SELECT * FROM athlete_health_devices WHERE athlete_id = ? AND platform = ?',
    [athleteId, data.platform],
  )
  return mapHealthDevice(result.rows[0])
}

export async function listHealthDevices(athleteId: string): Promise<HealthDevice[]> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM athlete_health_devices WHERE athlete_id = ? AND is_active = 1 ORDER BY created_at DESC',
    [athleteId],
  )
  return result.rows.map(mapHealthDevice)
}

/** Ownership-checked disconnect: device must belong to this athlete. */
export async function deactivateHealthDevice(athleteId: string, deviceId: string): Promise<boolean> {
  const db = getDB()
  const result = await db.execute(
    "UPDATE athlete_health_devices SET is_active = 0 WHERE id = ? AND athlete_id = ? AND is_active = 1",
    [deviceId, athleteId],
  )
  return (result.rowsAffected ?? 0) > 0
}

export type IncomingHealthMetric = {
  metricType: string
  value: number
  unit: string
  source: HealthPlatform
  sourceWorkoutId?: string | null
  recordedAt: string // ISO timestamp from the watch
}

/**
 * Batch-insert metrics with dedupe on (athlete, type, recorded_at). Returns how many
 * rows were actually inserted so re-syncs can report honestly.
 */
export async function insertHealthMetrics(athleteId: string, metrics: IncomingHealthMetric[]): Promise<number> {
  if (!metrics.length) return 0
  const db = getDB()
  let inserted = 0
  for (const m of metrics) {
    const result = await db.execute(
      `INSERT OR IGNORE INTO athlete_health_metrics
         (id, athlete_id, metric_type, value, unit, source, source_workout_id, recorded_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [generateId(), athleteId, m.metricType, m.value, m.unit, m.source, m.sourceWorkoutId ?? null, m.recordedAt],
    )
    inserted += result.rowsAffected ?? 0
  }
  return inserted
}

export type StoredHealthMetric = {
  metricType: string
  value: number
  unit: string
  source: string
  recordedAt: string
}

export async function getHealthMetrics(
  athleteId: string,
  opts: { metricType?: string; daysBack?: number } = {},
): Promise<StoredHealthMetric[]> {
  const db = getDB()
  const daysBack = opts.daysBack && opts.daysBack > 0 ? Math.min(opts.daysBack, 365) : 30
  const params: unknown[] = [athleteId]
  let where = 'WHERE athlete_id = ? AND recorded_at >= datetime(\'now\', ?)'
  params.push(`-${daysBack} days`)
  if (opts.metricType) {
    where += ' AND metric_type = ?'
    params.push(opts.metricType)
  }
  const result = await db.execute(
    `SELECT metric_type, value, unit, source, recorded_at FROM athlete_health_metrics ${where} ORDER BY recorded_at DESC`,
    params,
  )
  return result.rows.map(r => ({
    metricType: r.metric_type as string,
    value: r.value as number,
    unit: r.unit as string,
    source: r.source as string,
    recordedAt: r.recorded_at as string,
  }))
}

export type IncomingSleepLog = {
  date: string // YYYY-MM-DD reference night
  totalMinutes: number
  deepMinutes?: number | null
  remMinutes?: number | null
  lightMinutes?: number | null
  awakeMinutes?: number | null
  efficiency?: number | null
  score?: number | null
  source: HealthPlatform
  recordedAt: string
}

export async function upsertSleepLog(athleteId: string, log: IncomingSleepLog): Promise<void> {
  const db = getDB()
  await db.execute(
    `INSERT INTO athlete_sleep_logs
       (id, athlete_id, date, total_minutes, deep_minutes, rem_minutes, light_minutes,
        awake_minutes, efficiency, score, source, recorded_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(athlete_id, date, source) DO UPDATE SET
       total_minutes = excluded.total_minutes,
       deep_minutes = excluded.deep_minutes,
       rem_minutes = excluded.rem_minutes,
       light_minutes = excluded.light_minutes,
       awake_minutes = excluded.awake_minutes,
       efficiency = excluded.efficiency,
       score = excluded.score`,
    [
      generateId(), athleteId, log.date, log.totalMinutes,
      log.deepMinutes ?? null, log.remMinutes ?? null, log.lightMinutes ?? null,
      log.awakeMinutes ?? null, log.efficiency ?? null, log.score ?? null,
      log.source, log.recordedAt,
    ],
  )
}

export type StoredSleepLog = {
  date: string
  totalMinutes: number
  deepMinutes: number | null
  remMinutes: number | null
  lightMinutes: number | null
  awakeMinutes: number | null
  efficiency: number | null
  score: number | null
  source: string
}

export async function getSleepLogs(athleteId: string, daysBack = 30): Promise<StoredSleepLog[]> {
  const db = getDB()
  const days = daysBack && daysBack > 0 ? Math.min(daysBack, 365) : 30
  const result = await db.execute(
    `SELECT date, total_minutes, deep_minutes, rem_minutes, light_minutes, awake_minutes,
            efficiency, score, source
     FROM athlete_sleep_logs
     WHERE athlete_id = ? AND date >= date('now', ?)
     ORDER BY date DESC`,
    [athleteId, `-${days} days`],
  )
  return result.rows.map(r => ({
    date: r.date as string,
    totalMinutes: r.total_minutes as number,
    deepMinutes: (r.deep_minutes as number) ?? null,
    remMinutes: (r.rem_minutes as number) ?? null,
    lightMinutes: (r.light_minutes as number) ?? null,
    awakeMinutes: (r.awake_minutes as number) ?? null,
    efficiency: (r.efficiency as number) ?? null,
    score: (r.score as number) ?? null,
    source: r.source as string,
  }))
}

export async function markDeviceSynced(athleteId: string, platform: HealthPlatform): Promise<void> {
  const db = getDB()
  await db.execute(
    "UPDATE athlete_health_devices SET last_sync_at = datetime('now') WHERE athlete_id = ? AND platform = ?",
    [athleteId, platform],
  )
}

// ============== Workout Templates (migration 014) ==============

export type WorkoutTemplateExercise = Omit<WorkoutExercise, 'workoutId'> & { templateId?: string }

export type WorkoutTemplateSummary = {
  id: string
  coachId: string
  name: string
  description: string
  goal: string
  estimatedDurationMinutes: number | null
  exerciseCount: number
  createdAt: string
}

export type WorkoutTemplateDetail = WorkoutTemplateSummary & {
  exercises: WorkoutTemplateExercise[]
}

/** List the coach's templates with an exercise count (single aggregate query). */
export async function listWorkoutTemplates(coachId: string): Promise<WorkoutTemplateSummary[]> {
  const db = getDB()
  const result = await db.execute(
    `SELECT t.*, COUNT(e.id) AS exercise_count
     FROM workout_templates t
     LEFT JOIN workout_template_exercises e ON e.template_id = t.id
     WHERE t.coach_id = ?
     GROUP BY t.id
     ORDER BY t.created_at DESC`,
    [coachId],
  )
  return result.rows.map(r => ({
    id: r.id as string,
    coachId: r.coach_id as string,
    name: r.name as string,
    description: (r.description as string) || '',
    goal: (r.goal as string) || '',
    estimatedDurationMinutes: (r.estimated_duration_minutes as number) ?? null,
    exerciseCount: r.exercise_count as number,
    createdAt: r.created_at as string,
  }))
}

/**
 * Create a template with its exercises in one call. Exercises accept the same shapes as
 * assignment payloads (enriched or legacy builder), mapped once here.
 */
export async function saveWorkoutTemplate(coachId: string, data: {
  id?: string; name: string; description?: string; goal?: string;
  estimatedDurationMinutes?: number | null;
  exercises?: Array<Record<string, unknown>>;
}): Promise<string> {
  const db = getDB()
  const id = data.id || generateId()
  const existing = await db.execute('SELECT id FROM workout_templates WHERE id = ? AND coach_id = ?', [id, coachId])
  if (existing.rows.length > 0) {
    await db.execute(
      "UPDATE workout_templates SET name=?, description=?, goal=?, estimated_duration_minutes=?, updated_at=datetime('now') WHERE id=? AND coach_id=?",
      [data.name, data.description ?? '', data.goal ?? '', data.estimatedDurationMinutes ?? null, id, coachId],
    )
  } else {
    await db.execute(
      'INSERT INTO workout_templates (id, coach_id, name, description, goal, estimated_duration_minutes) VALUES (?,?,?,?,?,?)',
      [id, coachId, data.name, data.description ?? '', data.goal ?? '', data.estimatedDurationMinutes ?? null],
    )
  }
  if (Array.isArray(data.exercises)) {
    await db.execute('DELETE FROM workout_template_exercises WHERE template_id = ?', [id])
    for (let idx = 0; idx < data.exercises.length; idx++) {
      const raw = data.exercises[idx] as Record<string, unknown>
      const name = String(raw?.name ?? raw?.exerciseName ?? '').trim()
      if (!name) continue
      const setsRaw = raw?.sets
      const setArray = Array.isArray(setsRaw) ? setsRaw : null
      const setsCount = setArray ? setArray.length || 1 : Number(setsRaw ?? 1)
      await db.execute(
        `INSERT INTO workout_template_exercises
           (id, template_id, name, sets, reps, weight_kg, rest_seconds, sort_order, notes,
            mode, phase, superset_group, reps_min, reps_max, prog, inc, sec, minutes, speed,
            per_side, body_part, muscle_groups, library_exercise_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          generateId(), id, name,
          Number.isFinite(setsCount) && setsCount > 0 ? setsCount : 1,
          Number(raw?.reps ?? 0),
          (raw?.weightKg as number) ?? (raw?.weight as number) ?? null,
          (raw?.restSeconds as number) ?? (raw?.rest as number) ?? null,
          Number(raw?.sortOrder ?? raw?.order ?? idx),
          typeof raw?.notes === 'string' ? raw.notes : null,
          (raw?.mode as string) || 'reps',
          (raw?.phase as string) || 'work',
          (raw?.supersetGroup as string) || null,
          (raw?.repsMin as number) ?? null,
          (raw?.repsMax as number) ?? null,
          (raw?.prog as string) ?? null,
          (raw?.inc as number) ?? null,
          (raw?.sec as number) ?? null,
          (raw?.minutes as number) ?? null,
          (raw?.speed as number) ?? null,
          raw?.perSide ? 1 : 0,
          (raw?.bodyPart as string) || null,
          Array.isArray(raw?.muscleGroups) ? (raw.muscleGroups as string[]).join(',') : '',
          typeof raw?.libraryExerciseId === 'string' ? raw.libraryExerciseId : null,
        ],
      )
    }
  }
  return id
}

/** Ownership-checked detail read: out-of-scope reads as not found. */
export async function getWorkoutTemplate(coachId: string, templateId: string): Promise<WorkoutTemplateDetail | null> {
  const db = getDB()
  const head = await db.execute('SELECT * FROM workout_templates WHERE id = ? AND coach_id = ?', [templateId, coachId])
  if (head.rows.length === 0) return null
  const t = head.rows[0]
  const exResult = await db.execute(
    'SELECT * FROM workout_template_exercises WHERE template_id = ? ORDER BY sort_order',
    [templateId],
  )
  return {
    id: t.id as string,
    coachId: t.coach_id as string,
    name: t.name as string,
    description: (t.description as string) || '',
    goal: (t.goal as string) || '',
    estimatedDurationMinutes: (t.estimated_duration_minutes as number) ?? null,
    exerciseCount: exResult.rows.length,
    createdAt: t.created_at as string,
    exercises: exResult.rows.map(e => ({
      id: e.id as string,
      templateId: e.template_id as string,
      name: e.name as string,
      sets: e.sets as number,
      reps: e.reps as number,
      weightKg: (e.weight_kg as number) ?? null,
      restSeconds: (e.rest_seconds as number) ?? null,
      sortOrder: e.sort_order as number,
      notes: (e.notes as string) ?? null,
      mode: ((e.mode as string) || 'reps') as WorkoutExercise['mode'],
      phase: ((e.phase as string) || 'work') as WorkoutExercise['phase'],
      supersetGroup: (e.superset_group as string) || null,
      repsMin: (e.reps_min as number) ?? null,
      repsMax: (e.reps_max as number) ?? null,
      prog: (e.prog as WorkoutExercise['prog']) ?? null,
      inc: (e.inc as number) ?? null,
      sec: (e.sec as number) ?? null,
      minutes: (e.minutes as number) ?? null,
      speed: (e.speed as number) ?? null,
      perSide: e.per_side === 1,
      bodyPart: (e.body_part as string) || null,
      muscleGroups: String(e.muscle_groups || '').split(',').map(s => s.trim()).filter(Boolean),
      libraryExerciseId: (e.library_exercise_id as string) || null,
    })),
  }
}

export async function deleteWorkoutTemplate(coachId: string, templateId: string): Promise<boolean> {
  const db = getDB()
  const result = await db.execute('DELETE FROM workout_templates WHERE id = ? AND coach_id = ?', [templateId, coachId])
  return (result.rowsAffected ?? 0) > 0
}

/** Ownership-checked assignment detail (coach scope) — powers past-workout reassignment. */
export async function getAssignedWorkoutDetail(coachId: string, workoutId: string) {
  const db = getDB()
  const head = await db.execute('SELECT * FROM assigned_workouts WHERE id = ? AND coach_id = ?', [workoutId, coachId])
  if (head.rows.length === 0) return null
  const w = head.rows[0]
  const exResult = await db.execute(
    'SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY sort_order',
    [workoutId],
  )
  return {
    id: w.id as string,
    athleteId: w.athlete_id as string,
    athleteName: (w.athlete_name as string) || '',
    contentName: (w.content_name as string) || '',
    contentType: (w.content_type as string) || 'workout',
    modality: (w.modality as string) || '',
    startDate: w.start_date as string,
    endDate: w.end_date as string,
    status: w.status as string,
    progress: (w.progress as number) || 0,
    exercises: exResult.rows.map(e => ({
      id: e.id as string,
      name: e.name as string,
      sets: e.sets as number,
      reps: e.reps as number,
      weightKg: (e.weight_kg as number) ?? null,
      restSeconds: (e.rest_seconds as number) ?? null,
      sortOrder: e.sort_order as number,
      notes: (e.notes as string) ?? null,
      mode: ((e.mode as string) || 'reps') as WorkoutExercise['mode'],
      phase: ((e.phase as string) || 'work') as WorkoutExercise['phase'],
      supersetGroup: (e.superset_group as string) || null,
      repsMin: (e.reps_min as number) ?? null,
      repsMax: (e.reps_max as number) ?? null,
      prog: (e.prog as string) ?? null,
      inc: (e.inc as number) ?? null,
      sec: (e.sec as number) ?? null,
      minutes: (e.minutes as number) ?? null,
      speed: (e.speed as number) ?? null,
      perSide: e.per_side === 1 || e.per_side === true,
      bodyPart: (e.body_part as string) || null,
      muscleGroups: String(e.muscle_groups || '').split(',').map(s => s.trim()).filter(Boolean),
      libraryExerciseId: (e.library_exercise_id as string) || null,
    })),
  }
}

// ============== Video View Tracking (migration 016) ==============

export type VideoViewLog = {
  id: string
  exerciseId: string
  athleteId: string
  startedAt: string
  lastPositionSec: number
  totalDurationSec: number | null
  completed: boolean
  completedAt: string | null
}

/** Start a new view session; returns the view id for subsequent progress updates. */
export async function startVideoView(exerciseId: string, athleteId: string): Promise<string> {
  const db = getDB()
  const id = generateId()
  await db.execute(
    'INSERT INTO exercise_video_views (id, exercise_id, athlete_id, started_at, last_position_sec, completed) VALUES (?,?,?,datetime(\'now\'),0,0)',
    [id, exerciseId, athleteId],
  )
  return id
}

/** Update progress and optionally mark as completed (>= 90% of duration). */
export async function updateVideoView(
  viewId: string,
  positionSec: number,
  totalDurationSec: number,
  completed: boolean,
): Promise<void> {
  const db = getDB()
  await db.execute(
    `UPDATE exercise_video_views
     SET last_position_sec = ?, total_duration_sec = ?, completed = ?, completed_at = CASE WHEN ? = 1 THEN datetime('now') ELSE completed_at END
     WHERE id = ?`,
    [positionSec, totalDurationSec, completed ? 1 : 0, completed ? 1 : 0, viewId],
  )
}

export type VideoAnalytics = {
  exerciseId: string
  exerciseName: string
  totalViews: number
  completedViews: number
  completionRate: number | null
  avgPositionPct: number | null
  lastViewedAt: string | null
}

/** Coach analytics: aggregate view stats per exercise. */
export async function getVideoAnalytics(coachId: string): Promise<VideoAnalytics[]> {
  const db = getDB()
  const result = await db.execute(
    `SELECT
       v.exercise_id,
       el.name AS exercise_name,
       COUNT(*) AS total_views,
       SUM(CASE WHEN v.completed = 1 THEN 1 ELSE 0 END) AS completed_views,
       ROUND(AVG(CASE WHEN v.total_duration_sec > 0 THEN v.last_position_sec / v.total_duration_sec ELSE 0 END), 2) AS avg_position_pct,
       MAX(v.started_at) AS last_viewed_at
     FROM exercise_video_views v
     JOIN exercise_library el ON el.id = v.exercise_id
     WHERE el.coach_id = ? OR el.coach_id IS NULL
     GROUP BY v.exercise_id
     ORDER BY total_views DESC`,
    [coachId],
  )
  return result.rows.map(r => ({
    exerciseId: r.exercise_id as string,
    exerciseName: r.exercise_name as string,
    totalViews: r.total_views as number,
    completedViews: r.completed_views as number,
    completionRate: r.total_views > 0 ? Math.round((r.completed_views as number) / (r.total_views as number) * 100) : null,
    avgPositionPct: (r.avg_position_pct as number) ?? null,
    lastViewedAt: (r.last_viewed_at as string) || null,
  }))
}

// ============== Push Tokens (migration 017) ==============

export async function registerPushToken(userId: string, token: string, platform: string, role: string): Promise<void> {
  const db = getDB()
  await db.execute(
    `INSERT INTO push_tokens (id, user_id, token, platform, role) VALUES (?,?,?,?,?)
     ON CONFLICT(token) DO UPDATE SET is_active = 1, user_id = excluded.user_id`,
    [generateId(), userId, token, platform, role],
  )
}

export async function getPushTokens(userIds: string[]): Promise<Array<{ token: string; platform: string }>> {
  if (userIds.length === 0) return []
  const db = getDB()
  const placeholders = userIds.map(() => '?').join(',')
  const result = await db.execute(
    `SELECT token, platform FROM push_tokens WHERE user_id IN (${placeholders}) AND is_active = 1`,
    userIds,
  )
  return result.rows.map(r => ({ token: r.token as string, platform: r.platform as string }))
}

// ============== Community Forums & Messages (migration 018) ==============

export async function getCommunityForums(coachId?: string) {
  const db = getDB()
  const result = coachId
    ? await db.execute('SELECT * FROM community_forums WHERE coach_id = ? ORDER BY created_at DESC', [coachId])
    : await db.execute('SELECT * FROM community_forums ORDER BY created_at DESC')
  return result.rows.map(r => ({
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string) || '',
    category: (r.category as string) || 'general',
    coachId: (r.coach_id as string) || null,
    createdAt: r.created_at as string,
  }))
}

export async function getCommunityMessages(forumId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM community_messages WHERE forum_id = ? ORDER BY created_at ASC',
    [forumId],
  )
  return result.rows.map(r => ({
    id: r.id as string,
    forumId: r.forum_id as string,
    userId: r.user_id as string,
    userName: (r.user_name as string) || 'Athlete',
    message: r.message as string,
    createdAt: r.created_at as string,
  }))
}

export async function createCommunityMessage(data: {
  forumId: string
  userId: string
  userName?: string
  message: string
}) {
  const db = getDB()
  const id = generateId()
  await db.execute(
    `INSERT INTO community_messages (id, forum_id, user_id, user_name, message, created_at)
     VALUES (?,?,?,?,?,datetime('now'))`,
    [id, data.forumId, data.userId, data.userName || 'Athlete', data.message],
  )
  return id
}

// ============== Community Challenges (migration 018) ==============

export async function getCommunityChallenges() {
  const db = getDB()
  const result = await db.execute(
    "SELECT * FROM community_challenges WHERE status = 'active' ORDER BY created_at DESC",
  )
  return result.rows.map(r => ({
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string) || '',
    durationMinutes: r.duration_minutes as number,
    calories: r.calories as number,
    participantsCount: r.participants_count as number,
    status: r.status as string,
    startDate: (r.start_date as string) || null,
    endDate: (r.end_date as string) || null,
    createdAt: r.created_at as string,
  }))
}

export async function joinChallenge(challengeId: string, userId: string) {
  const db = getDB()
  const id = generateId()
  try {
    await db.execute(
      `INSERT INTO community_challenge_participants (id, challenge_id, user_id, joined_at, progress)
       VALUES (?,?,?,datetime('now'),0)`,
      [id, challengeId, userId],
    )
    await db.execute(
      'UPDATE community_challenges SET participants_count = participants_count + 1 WHERE id = ?',
      [challengeId],
    )
    return { joined: true, participantId: id }
  } catch {
    // UNIQUE constraint — already joined
    return { joined: false, participantId: null }
  }
}

export async function getChallengeParticipants(challengeId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM community_challenge_participants WHERE challenge_id = ? ORDER BY joined_at ASC',
    [challengeId],
  )
  return result.rows.map(r => ({
    id: r.id as string,
    challengeId: r.challenge_id as string,
    userId: r.user_id as string,
    joinedAt: r.joined_at as string,
    progress: r.progress as number,
  }))
}

// ============== Athlete Notifications (migration 018) ==============

export async function getAthleteNotifications(userId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM athlete_notifications WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
  )
  return result.rows.map(r => ({
    id: r.id as string,
    userId: r.user_id as string,
    type: (r.type as string) || 'system',
    title: r.title as string,
    message: (r.message as string) || '',
    icon: (r.icon as string) || '',
    read: r.read === 1,
    createdAt: r.created_at as string,
  }))
}

export async function markNotificationRead(notificationId: string) {
  const db = getDB()
  await db.execute(
    'UPDATE athlete_notifications SET read = 1 WHERE id = ?',
    [notificationId],
  )
}

// ============== Athlete Favorites (migration 018) ==============

export async function getAthleteFavorites(userId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM athlete_favorites WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
  )
  return result.rows.map(r => ({
    id: r.id as string,
    userId: r.user_id as string,
    itemType: r.item_type as string,
    itemId: r.item_id as string,
    itemTitle: (r.item_title as string) || '',
    itemMeta: (r.item_meta as string) || '',
    createdAt: r.created_at as string,
  }))
}

export async function addAthleteFavorite(userId: string, data: {
  itemType: string
  itemId: string
  itemTitle?: string
  itemMeta?: string
}) {
  const db = getDB()
  const id = generateId()
  try {
    await db.execute(
      `INSERT INTO athlete_favorites (id, user_id, item_type, item_id, item_title, item_meta, created_at)
       VALUES (?,?,?,?,?,?,datetime('now'))`,
      [id, userId, data.itemType, data.itemId, data.itemTitle || '', data.itemMeta || ''],
    )
    return { id, added: true }
  } catch {
    // UNIQUE constraint — already favorited
    return { id: null, added: false }
  }
}

export async function removeAthleteFavorite(userId: string, favoriteId: string) {
  const db = getDB()
  await db.execute(
    'DELETE FROM athlete_favorites WHERE id = ? AND user_id = ?',
    [favoriteId, userId],
  )
}
