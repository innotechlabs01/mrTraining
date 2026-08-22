import { NextRequest, NextResponse } from 'next/server'
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'
import { recordPayment, cancelMembership, getMembershipById } from '@/lib/coaching-db'

function toDateString(d: Date | string | null | undefined): string {
  if (!d) return new Date().toISOString()
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString()
}

function periodEndFor(start: string, billingPeriod: string): string {
  const end = new Date(`${start}T00:00:00Z`)
  end.setMonth(end.getMonth() + (billingPeriod === 'yearly' ? 12 : 1))
  return end.toISOString().split('T')[0]
}

export async function POST(req: NextRequest) {
  // Fail-closed: an empty/absent webhook secret means the HMAC key is empty,
  // which would let any request pass signature verification. Reject before we
  // even attempt to read/verify the event.
  const secret = process.env.POLAR_WEBHOOK_SECRET || ''
  if (!secret) {
    return NextResponse.json({ error: 'webhook not configured' }, { status: 503 })
  }

  const body = await req.text()

  try {
    const headers: Record<string, string> = {}
    for (const [k, v] of req.headers.entries()) {
      headers[k] = v
    }

    // Throws WebhookVerificationError if the signature is invalid.
    const event = validateEvent(body, headers, secret)
    const type = event.type

    if (type === 'order.paid') {
      const order = event.data
      const meta = order.metadata || {}
      const membershipId = String(meta.membershipId || '')
      const athleteId = String(meta.athleteId || '')
      const coachId = String(meta.coachId || '')

      const membership = membershipId ? await getMembershipById(membershipId) : null
      if (!membership) {
        console.error('Polar order.paid: membership not found for metadata', { membershipId, athleteId, coachId })
        return NextResponse.json({ received: true })
      }
      if (membership.athleteId !== athleteId || membership.coachId !== coachId) {
        console.error('Polar order.paid: membership ids mismatch, ignoring', {
          membershipId,
          athleteId,
          coachId,
          membershipAthleteId: membership.athleteId,
          membershipCoachId: membership.coachId,
        })
        return NextResponse.json({ received: true })
      }

      const paidAt = toDateString(order.createdAt)
      const periodStart = paidAt.split('T')[0]
      // Use the membership's own billing_period so the recorded period_end
      // matches how the membership was created (fall back to 'monthly').
      const billingPeriod = membership.billingPeriod || 'monthly'
      await recordPayment({
        membershipId: membership.id,
        athleteId: membership.athleteId,
        coachId: membership.coachId,
        amount: (order.totalAmount || 0) / 100,
        currency: order.currency || 'USD',
        status: 'completed',
        polarOrderId: order.id,
        polarInvoiceUrl: order.invoiceNumber ? `https://polar.sh/invoices/${order.invoiceNumber}` : undefined,
        periodStart,
        periodEnd: periodEndFor(periodStart, billingPeriod),
        paidAt,
      })
    }

    if (type === 'subscription.canceled') {
      const meta = event.data.metadata || {}
      const membershipId = String(meta.membershipId || '')

      const membership = membershipId ? await getMembershipById(membershipId) : null
      if (!membership) {
        console.error('Polar subscription.canceled: membership not found for metadata', { membershipId })
        return NextResponse.json({ received: true })
      }

      await cancelMembership(membership.id)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
    console.error('Polar webhook error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
