import { getDB, generateId } from './db'

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
  return result.rows.map((r: { id: string; coach_id: string; athlete_id: string; athlete_name: string; date: string; start_time: string; end_time: string; status: string; athlete_sports: string[]; athlete_modality: string; athlete_level: string; athlete_goal: string; athlete_frequency: number; athlete_duration: number; athlete_equipment: string; athlete_routine_accepted: boolean; notes: string }) => ({
    id: r.id as string,
    coachId: r.coach_id as string,
    athleteId: r.athlete_id as string,
    athleteName: r.athlete_name as string,
    date: r.date as string,
    startTime: r.start_time as string,
    endTime: r.end_time as string,
    status: r.status as CoachAppointment['status'],
    athleteSports: JSON.parse((r.athlete_sports as unknown as string) || '[]'),
    athleteModality: (r.athlete_modality as string) || '',
    athleteLevel: (r.athlete_level as string) || '',
    athleteGoal: (r.athlete_goal as string) || '',
    athleteFrequency: (r.athlete_frequency as number) || 0,
    athleteDuration: (r.athlete_duration as number) || 0,
    athleteEquipment: (r.athlete_equipment as string) || '',
    athleteRoutineAccepted: Number(r.athlete_routine_accepted) === 1,
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
    athleteRoutineAccepted: Number(r.athlete_routine_accepted) === 1,
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
  return result.rows.map((r: { id: string; coach_id: string; day_of_week: number; start_time: string; end_time: string }) => ({
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
