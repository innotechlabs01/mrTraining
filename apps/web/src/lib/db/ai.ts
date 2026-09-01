import { getDB, generateId, safeExecute } from './db'
import type { Row } from '@libsql/client'

// ============== AI Suggestions ==============

export async function getAISuggestions(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM ai_suggestions WHERE coach_id = ? ORDER BY created_at DESC',
    [coachId],
  )
  return result.rows.map((r: Row) => ({
    id: r.id, type: r.type, title: r.title, description: r.description,
    reasoning: r.reasoning, actionLabel: r.action_label,
    dismissed: r.dismissed === 1, applied: r.applied === 1,
  }))
}

export async function saveAISuggestion(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = generateId()
  await safeExecute(
    db,
    'INSERT INTO ai_suggestions (id, type, title, description, reasoning, action_label, coach_id) VALUES (?,?,?,?,?,?,?)',
    [id, data.type, data.title, data.description, data.reasoning, data.actionLabel, coachId],
  )
  return id
}

// ============== Live Sessions ==============

export async function getLiveSessions(coachId: string) {
  const db = getDB()
const result = await db.execute(
    'SELECT * FROM live_sessions WHERE coach_id = ? ORDER BY time DESC',
    [coachId],
  )
  return result.rows.map((r: Row) => ({
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
    await safeExecute(
      db,
      'UPDATE live_sessions SET title=?, description=?, date=?, start_time=?, end_time=?, modality=?, location=?, notes=?, is_public=?, capacity=?, enrolled=?, status=?, link=?, distance_km=?, pace=?, updated_at=datetime(\'now\') WHERE id=? AND coach_id=?',
      [data.title, data.description || '', data.date, data.startTime, data.endTime, data.modality, data.location || '', data.notes || '', data.public ? 1 : 0, data.capacity || 0, data.enrolled || 0, data.status, data.link || '', data.distanceKm || null, data.pace || '', id, coachId],
    )
  } else {
    await safeExecute(
      db,
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
