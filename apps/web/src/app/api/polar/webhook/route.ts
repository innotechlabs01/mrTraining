import { NextRequest, NextResponse } from 'next/server'
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'
import { recordPayment, cancelMembership } from '@/lib/coaching-db'

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
  const secret = process.env.POLAR_WEBHOOK_SECRET || ''
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

      if (membershipId && athleteId && coachId) {
        const paidAt = toDateString(order.createdAt)
        const periodStart = paidAt.split('T')[0]
        await recordPayment({
          membershipId,
          athleteId,
          coachId,
          amount: (order.totalAmount || 0) / 100,
          currency: order.currency || 'USD',
          status: 'completed',
          polarOrderId: order.id,
          polarInvoiceUrl: order.invoiceNumber ? `https://polar.sh/invoices/${order.invoiceNumber}` : undefined,
          periodStart,
          periodEnd: periodEndFor(periodStart, 'monthly'),
          paidAt,
        })
      }
    }

    if (type === 'subscription.canceled') {
      const meta = event.data.metadata || {}
      const membershipId = String(meta.membershipId || '')
      if (membershipId) {
        await cancelMembership(membershipId)
      }
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
