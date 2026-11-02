import { safeExecute, generateId } from './db'

// ============== AI Suggestions ==============

export async function getAISuggestions(coachId: string) {
  const result = await safeExecute(
    'SELECT * FROM ai_suggestions WHERE coach_id = $1 ORDER BY created_at DESC',
    [coachId],
  )
  return result.rows.map((r: Record<string, unknown>) => ({
    id: r.id, type: r.type, title: r.title, description: r.description,
    reasoning: r.reasoning, actionLabel: r.action_label,
    dismissed: r.dismissed === true, applied: r.applied === true,
  }))
}

export async function saveAISuggestion(coachId: string, data: Record<string, unknown>) {
  const id = generateId()
  await safeExecute(
    'INSERT INTO ai_suggestions (id, type, title, description, reasoning, action_label, coach_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, data.type, data.title, data.description, data.reasoning, data.actionLabel, coachId],
  )
  return id
}

// ============== Live Sessions ==============

export async function getLiveSessions(coachId: string) {
  const result = await safeExecute(
    'SELECT * FROM live_sessions WHERE coach_id = $1 ORDER BY time DESC',
    [coachId],
  )
  return result.rows.map((r: Record<string, unknown>) => ({
    id: r.id, title: r.title, description: r.description || '',
    date: r.date, startTime: r.start_time, endTime: r.end_time,
    modality: r.modality, location: r.location || '', notes: r.notes || '',
    public: r.is_public === true, capacity: r.capacity, enrolled: r.enrolled, status: r.status,
    link: r.link || '', distanceKm: r.distance_km, pace: r.pace || '',
  }))
}

export async function saveLiveSession(coachId: string, data: Record<string, unknown>) {
  const id = (data.id as string) || generateId()
  const existing = await safeExecute('SELECT id FROM live_sessions WHERE id = $1 AND coach_id = $2', [id, coachId])
  if (existing.rows.length > 0) {
    await safeExecute(
      'UPDATE live_sessions SET title=$1, description=$2, date=$3, start_time=$4, end_time=$5, modality=$6, location=$7, notes=$8, is_public=$9, capacity=$10, enrolled=$11, status=$12, link=$13, distance_km=$14, pace=$15, updated_at=NOW() WHERE id=$16 AND coach_id=$17',
      [data.title, data.description || '', data.date, data.startTime, data.endTime, data.modality, data.location || '', data.notes || '', data.public === true, data.capacity || 0, data.enrolled || 0, data.status, data.link || '', data.distanceKm || null, data.pace || '', id, coachId],
    )
  } else {
    await safeExecute(
      'INSERT INTO live_sessions (id, title, description, date, start_time, end_time, modality, location, notes, is_public, capacity, enrolled, status, link, distance_km, pace, coach_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)',
      [id, data.title, data.description || '', data.date, data.startTime, data.endTime, data.modality, data.location || '', data.notes || '', data.public === true, data.capacity || 0, data.enrolled || 0, data.status, data.link || '', data.distanceKm || null, data.pace || '', coachId],
    )
  }
  return id
}

export async function deleteLiveSession(coachId: string, sessionId: string) {
  await safeExecute('DELETE FROM live_sessions WHERE id = $1 AND coach_id = $2', [sessionId, coachId])
}
