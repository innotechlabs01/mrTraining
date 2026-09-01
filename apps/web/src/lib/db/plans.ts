import { getDB, generateId, safeExecute } from './db'

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
    await safeExecute(
      db,
      'UPDATE plans SET name=?, description=?, price=?, currency=?, billing_period=?, max_athletes=?, max_sessions_per_week=?, is_active=?, athlete_count=?, discount_type=?, discount_value=?, discount_label=?, discount_valid_from=?, discount_valid_until=?, discount_code=?, updated_at=datetime(\'now\') WHERE id=? AND coach_id=?',
      [data.name, data.description, data.price, data.currency, data.billingPeriod, data.maxAthletes, data.maxSessionsPerWeek, data.isActive ? 1 : 0, data.athleteCount || 0, discount?.type || null, discount?.value || null, discount?.label || null, discount?.validFrom || null, discount?.validUntil || null, discount?.code || null, id, coachId],
    )
  } else {
    await safeExecute(
      db,
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
