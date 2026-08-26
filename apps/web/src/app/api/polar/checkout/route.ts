import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Polar } from '@polar-sh/sdk'
import { getAthleteByClerkId, getAthleteMembership } from '@/lib/db'

function getPolar() {
  return new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN || '' })
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const athlete = await getAthleteByClerkId(userId)
    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    const membership = await getAthleteMembership(athlete.id)
    if (!membership) {
      return NextResponse.json({ error: 'No active membership' }, { status: 404 })
    }

    if (!process.env.POLAR_ACCESS_TOKEN) {
      if (process.env.MOCK_POLAR === 'true') {
        const mockOrderId = `mock_order_${Date.now()}`;
        const mockUrl = `https://polar.sh/mock/checkout/${mockOrderId}?membershipId=${membership.id}`;
        console.log('[polar-checkout] MOCK mode — returning mock checkout', { mockOrderId, membershipId: membership.id });
        return NextResponse.json({ url: mockUrl, orderId: mockOrderId })
      }
      return NextResponse.json({ error: 'Polar not configured' }, { status: 500 })
    }

    const productId = membership.polarProductId || process.env.POLAR_DEFAULT_PRODUCT_ID || ''
    if (!productId) {
      return NextResponse.json({ error: 'product not configured' }, { status: 400 })
    }

    const successUrl = (process.env.NEXT_PUBLIC_APP_URL || '') + '/membership?success=1'

    const polar = getPolar()
    const checkout = await polar.checkouts.create({
      products: [productId],
      customerEmail: athlete.email || undefined,
      metadata: {
        membershipId: membership.id,
        athleteId: athlete.id,
        coachId: membership.coachId,
      },
      successUrl,
    })

    return NextResponse.json({ url: checkout.url, orderId: checkout.id })
  } catch (err) {
    console.error('Error creating Polar checkout:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
