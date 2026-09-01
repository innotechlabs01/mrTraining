import { getDB, generateId } from './db'

// ============== Athletes ==============

export async function getAthletes(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM coach_athletes WHERE coach_id = ? ORDER BY created_at',
    [coachId],
  )
  // Collect athlete IDs that have user_* emails so we can backfill from users table
  const athleteIds = result.rows.map((r: { id: string }) => r.id as string)
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
