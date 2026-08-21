/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck -- libsql execute args are runtime-safe; InValue type too strict for dynamic query building
/* eslint-enable @typescript-eslint/ban-ts-comment */
import { createClient } from '@libsql/client'

function getDB() {
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
  return result.rows.map(r => {
    const rawName = (r.name as string) || ''
    const email = (r.email as string) || ''
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
  const email = (r.email as string) || ''
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
  const existing = await db.execute('SELECT id FROM assigned_workouts WHERE id = ? AND coach_id = ?', [id, coachId])
  if (existing.rows.length > 0) {
    await db.execute(
      'UPDATE assigned_workouts SET athlete_id=?, athlete_name=?, content_id=?, content_type=?, content_name=?, modality=?, start_date=?, end_date=?, days_of_week=?, status=?, progress=?, updated_at=datetime(\'now\') WHERE id=? AND coach_id=?',
      [data.athleteId, data.athleteName, data.contentId, data.contentType, data.contentName, data.modality, data.startDate, data.endDate, JSON.stringify(data.daysOfWeek || []), data.status, data.progress, id, coachId],
    )
  } else {
    await db.execute(
      'INSERT INTO assigned_workouts (id, athlete_id, athlete_name, content_id, content_type, content_name, modality, start_date, end_date, days_of_week, status, progress, coach_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, data.athleteId, data.athleteName, data.contentId, data.contentType, data.contentName, data.modality, data.startDate, data.endDate, JSON.stringify(data.daysOfWeek || []), data.status, data.progress, coachId],
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
  paddleSubscriptionId: string | null
  paddlePriceId: string | null
}

export type MembershipPayment = {
  id: string
  membershipId: string
  athleteId: string
  coachId: string
  amount: number
  currency: string
  status: string
  paddleTransactionId: string | null
  paddleInvoiceUrl: string | null
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
    paddleSubscriptionId: r.paddle_subscription_id as string || null,
    paddlePriceId: r.paddle_price_id as string || null,
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
    paddleTransactionId: r.paddle_transaction_id as string || null,
    paddleInvoiceUrl: r.paddle_invoice_url as string || null,
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
  paddleTransactionId?: string
  paddleInvoiceUrl?: string
  periodStart: string
  periodEnd: string
  paidAt?: string
}): Promise<string> {
  const db = getDB()
  const id = generateId()
  await db.execute(
    `INSERT INTO membership_payments (id, membership_id, athlete_id, coach_id, amount, currency, status, paddle_transaction_id, paddle_invoice_url, period_start, period_end, paid_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, data.membershipId, data.athleteId, data.coachId, data.amount, data.currency || 'USD', data.status || 'completed', data.paddleTransactionId || null, data.paddleInvoiceUrl || null, data.periodStart, data.periodEnd, data.paidAt || new Date().toISOString()],
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
