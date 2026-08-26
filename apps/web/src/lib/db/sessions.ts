// @ts-nocheck — libsql InValue type is too strict for Record<string, unknown> dynamic params.
import { getDB, generateId } from './db'

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
