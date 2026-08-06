import { NextRequest, NextResponse } from 'next/server'
import { recordPayment, cancelMembership } from '@/lib/coaching-db'

type PaddleWebhookEvent = {
  event_type: string
  data: {
    id: string
    custom_data?: Record<string, string>
    details?: {
      totals?: { total?: string; currency_code?: string }
    }
    created_at?: string
    invoice_number?: string
  }
  notification_id: string
}

export async function POST(req: NextRequest) {
  const event: PaddleWebhookEvent = await req.json()

  try {
    const eventType = event.event_type
    const data = event.data
    const customData = data.custom_data || {}

    if (eventType === 'transaction.completed') {
      const periodStart = data.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
      const periodEnd = new Date(new Date(periodStart).setMonth(new Date(periodStart).getMonth() + 1)).toISOString().split('T')[0]

      await recordPayment({
        membershipId: customData.membership_id || '',
        athleteId: customData.athlete_id || '',
        coachId: customData.coach_id || '',
        amount: parseFloat(data.details?.totals?.total || '0'),
        currency: data.details?.totals?.currency_code || 'USD',
        status: 'completed',
        paddleTransactionId: data.id,
        paddleInvoiceUrl: data.invoice_number ? `https://vendors.paddle.com/invoices/${data.invoice_number}` : undefined,
        periodStart,
        periodEnd,
        paidAt: data.created_at || new Date().toISOString(),
      })
    }

    if (eventType === 'subscription.cancelled') {
      if (customData.membership_id) {
        await cancelMembership(customData.membership_id)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Paddle webhook error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
