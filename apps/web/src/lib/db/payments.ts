import { getDB, generateId } from './db'

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
