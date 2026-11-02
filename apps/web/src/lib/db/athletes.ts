import { safeExecute, generateId } from './db'

// ============== Athletes ==============

export async function getAthletes(coachId: string) {
  const result = await safeExecute(
    'SELECT * FROM coach_athletes WHERE coach_id = $1 ORDER BY created_at',
    [coachId],
  )
  // Collect athlete IDs that have user_* emails so we can backfill from users table
  const athleteIds = result.rows.map((r: Record<string, unknown>) => r.id as string)
  const userEmailMap: Record<string, string> = {}
  if (athleteIds.length > 0) {
    const placeholders2 = athleteIds.map((_, i) => `$${i + 2}`).join(',')
    const userRows = await safeExecute(
      `SELECT id, email FROM users WHERE id IN (${placeholders2})`,
      athleteIds,
    )
    for (const ur of userRows.rows) {
      userEmailMap[ur.id as string] = (ur.email as string) || ''
    }
  }
  return result.rows.map((r: Record<string, unknown>) => {
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
  const result = await safeExecute(
    'SELECT * FROM coach_athletes WHERE coach_id = $1 AND id = $2',
    [coachId, athleteId],
  )
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  const weightRows = await safeExecute(
    'SELECT * FROM athlete_weight_history WHERE athlete_id = $1 ORDER BY date',
    [athleteId],
  )
  const rawName = (r.name as string) || ''
  let email = (r.email as string) || ''
  // Backfill: if email looks like a Clerk user ID, resolve from users table
  if (email.startsWith('user_') || !email.includes('@')) {
    const userRows = await safeExecute('SELECT email FROM users WHERE id = $1', [athleteId])
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
    weightHistory: weightRows.rows.map((w: Record<string, unknown>) => ({ date: w.date as string, weight: w.weight as number, muscleMass: w.muscle_mass as number, bodyFat: w.body_fat as number })),
    todaySessionIds: [] as string[],
  }
}

export async function saveAthlete(coachId: string, data: Record<string, unknown>) {
  const id = (data.id as string) || generateId()
  const existing = await safeExecute('SELECT id FROM coach_athletes WHERE id = $1 AND coach_id = $2', [id, coachId])
  if (existing.rows.length > 0) {
    const plan = data.plan as Record<string, unknown> | undefined
    const schedule = data.schedule as Record<string, unknown> | undefined
    const readiness = data.readiness as Record<string, unknown> | undefined
    const flag = data.flag as Record<string, unknown> | undefined
    const runningDevice = data.runningDevice as Record<string, unknown> | undefined
    await safeExecute(
      `UPDATE coach_athletes SET name=$1, sport=$2, email=$3, phone=$4, service_type=$5,
        plan_name=$6, plan_price=$7, plan_billing=$8, schedule_days=$9, schedule_time=$10,
        start_date=$11, emergency_contact=$12, sleep=$13, hrv=$14, recovery=$15,
        readiness_score=$16, flag_type=$17, flag_severity=$18, flag_message=$19,
        running_device_brand=$20, running_device_model=$21, running_device_synced=$22,
        running_device_last_sync=$23, updated_at=NOW()
        WHERE id=$24 AND coach_id=$25`,
      [data.name, data.sport, data.email, data.phone, data.serviceType, plan?.name, plan?.price, plan?.billingPeriod, schedule?.days, schedule?.time, data.startDate, data.emergencyContact, readiness?.sleep, readiness?.hrv, readiness?.recovery, readiness?.score, flag?.type || '', flag?.severity || '', flag?.message || '', runningDevice?.brand || '', runningDevice?.model || '', runningDevice?.synced ? 1 : 0, runningDevice?.lastSync || '', id, coachId],
    )
  } else {
    const plan = data.plan as Record<string, unknown> | undefined
    const schedule = data.schedule as Record<string, unknown> | undefined
    const readiness = data.readiness as Record<string, unknown> | undefined
    const flag = data.flag as Record<string, unknown> | undefined
    const runningDevice = data.runningDevice as Record<string, unknown> | undefined
    await safeExecute(
      `INSERT INTO coach_athletes (id, name, sport, email, phone, service_type, plan_name, plan_price, plan_billing, schedule_days, schedule_time, start_date, emergency_contact, sleep, hrv, recovery, readiness_score, flag_type, flag_severity, flag_message, running_device_brand, running_device_model, running_device_synced, running_device_last_sync, coach_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
      [id, data.name, data.sport, data.email, data.phone, data.serviceType, plan?.name, plan?.price, plan?.billingPeriod, schedule?.days, schedule?.time, data.startDate, data.emergencyContact, readiness?.sleep, readiness?.hrv, readiness?.recovery, readiness?.score, flag?.type || '', flag?.severity || '', flag?.message || '', runningDevice?.brand || '', runningDevice?.model || '', runningDevice?.synced ? 1 : 0, runningDevice?.lastSync || '', coachId],
    )
  }
  if (data.weightHistory && Array.isArray(data.weightHistory)) {
    await safeExecute('DELETE FROM athlete_weight_history WHERE athlete_id = $1', [id])
    for (const w of data.weightHistory as Array<Record<string, unknown>>) {
      await safeExecute(
        'INSERT INTO athlete_weight_history (id, athlete_id, date, weight, muscle_mass, body_fat) VALUES ($1,$2,$3,$4,$5,$6)',
        [generateId(), id, w.date, w.weight, w.muscleMass || 0, w.bodyFat || 0],
      )
    }
  }
  return id
}

export async function deleteAthlete(coachId: string, athleteId: string) {
  await safeExecute('DELETE FROM coach_athletes WHERE id = $1 AND coach_id = $2', [athleteId, coachId])
}

// ============== Athlete-Scoped Queries (for mobile app) ==============

export async function getAthleteByClerkId(clerkUserId: string) {
  let result = await safeExecute(
    'SELECT * FROM coach_athletes WHERE id = $1 LIMIT 1',
    [clerkUserId],
  )
  if (result.rows.length === 0) {
    result = await safeExecute(
      `SELECT ca.* FROM coach_athletes ca
       INNER JOIN users u ON ca.email = u.email
       WHERE u.id = $1 LIMIT 1`,
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
  const result = await safeExecute(
    'SELECT * FROM assigned_workouts WHERE athlete_id = $1 ORDER BY created_at DESC',
    [athleteId],
  )
  return result.rows.map((r: Record<string, unknown>) => ({
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
  const result = await safeExecute(
    `SELECT cs.* FROM coach_sessions cs
     INNER JOIN session_athletes sa ON cs.id = sa.session_id
     WHERE sa.athlete_id = $1
     ORDER BY cs.time`,
    [athleteId],
  )
  return result.rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: r.name as string,
    time: r.time as string,
    endTime: r.end_time as string,
    location: r.location as string,
    status: r.status as string,
  }))
}

export async function getAthleteAppointments(athleteId: string) {
  const result = await safeExecute(
    'SELECT * FROM appointments WHERE athlete_id = $1 ORDER BY date DESC, start_time DESC',
    [athleteId],
  )
  return result.rows.map((r: Record<string, unknown>) => ({
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
  const result = await safeExecute(
    'SELECT * FROM coach_availability WHERE coach_id = $1 ORDER BY day_of_week, start_time',
    [coachId],
  )
  return result.rows.map((r: Record<string, unknown>) => ({
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
  const id = generateId()
  await safeExecute(
    `INSERT INTO appointments (id, coach_id, athlete_id, athlete_name, date, start_time, end_time, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, data.coachId, data.athleteId, data.athleteName, data.date, data.startTime, data.endTime, 'scheduled', data.notes || ''],
  )
  return id
}

// ============== Coach Appointments (for coach dashboard) ==============

export interface CoachAppointment {
  id: string
  coachId: string
  athleteId: string
  athleteName: string
  date: string
  startTime: string
  endTime: string
  status: string
  notes: string
}

export async function getCoachAppointments(coachId: string): Promise<CoachAppointment[]> {
  const result = await safeExecute(
    'SELECT * FROM appointments WHERE coach_id = $1 ORDER BY date DESC, start_time DESC',
    [coachId]
  )
  return result.rows.map((r: Record<string, unknown>) => ({
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

export async function getAthleteAppointment(id: string): Promise<CoachAppointment | null> {
  const result = await safeExecute('SELECT * FROM appointments WHERE id = $1', [id])
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  return {
    id: r.id as string,
    coachId: r.coach_id as string,
    athleteId: r.athlete_id as string,
    athleteName: r.athlete_name as string,
    date: r.date as string,
    startTime: r.start_time as string,
    endTime: r.end_time as string,
    status: r.status as string,
    notes: (r.notes as string) || '',
  }
}

export async function createAppointment(data: {
  coachId: string; athleteId: string; athleteName: string;
  date: string; startTime: string; endTime: string;
  notes?: string;
}): Promise<string> {
  const id = generateId()
  await safeExecute(
    `INSERT INTO appointments (id, coach_id, athlete_id, athlete_name, date, start_time, end_time, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, data.coachId, data.athleteId, data.athleteName, data.date, data.startTime, data.endTime, 'scheduled', data.notes || ''],
  )
  return id
}

export async function updateAppointment(id: string, data: Partial<{ status: string; notes?: string; date?: string; startTime?: string; endTime?: string }>): Promise<void> {
  const updates: string[] = []
  const params: unknown[] = []
  let paramIdx = 1

  if (data.status !== undefined) { updates.push(`status = $${paramIdx++}`); params.push(data.status) }
  if (data.notes !== undefined) { updates.push(`notes = $${paramIdx++}`); params.push(data.notes) }
  if (data.date !== undefined) { updates.push(`date = $${paramIdx++}`); params.push(data.date) }
  if (data.startTime !== undefined) { updates.push(`start_time = $${paramIdx++}`); params.push(data.startTime) }
  if (data.endTime !== undefined) { updates.push(`end_time = $${paramIdx++}`); params.push(data.endTime) }

  if (updates.length === 0) return

  params.push(id)
  await safeExecute(
    `UPDATE appointments SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
    params
  )
}

// ============== Coach Availability ==============

export interface CoachAvailabilitySlot {
  id: string
  coachId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

export async function getCoachAvailability(coachId: string): Promise<CoachAvailabilitySlot[]> {
  const result = await safeExecute(
    'SELECT * FROM coach_availability WHERE coach_id = $1 ORDER BY day_of_week, start_time',
    [coachId]
  )
  return result.rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    coachId: r.coach_id as string,
    dayOfWeek: r.day_of_week as number,
    startTime: r.start_time as string,
    endTime: r.end_time as string,
  }))
}

export async function saveCoachAvailability(coachId: string, slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>): Promise<void> {
  await safeExecute('DELETE FROM coach_availability WHERE coach_id = $1', [coachId])
  for (const slot of slots) {
    await safeExecute(
      `INSERT INTO coach_availability (id, coach_id, day_of_week, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5)`,
      [generateId(), coachId, slot.dayOfWeek, slot.startTime, slot.endTime]
    )
  }
}
