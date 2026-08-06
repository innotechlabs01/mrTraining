import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getAthleteMembership } from '@/lib/coaching-db'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { athleteId } = body

  if (!athleteId) return NextResponse.json({ error: 'athleteId required' }, { status: 400 })

  const membership = await getAthleteMembership(athleteId)
  if (!membership) return NextResponse.json({ error: 'No active membership' }, { status: 404 })

  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || ''
  const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox'

  return NextResponse.json({
    clientToken,
    environment,
    amount: membership.planPrice,
    currency: 'USD',
    planName: membership.planName,
    membershipId: membership.id,
    athleteId,
    coachId: membership.coachId,
    paddlePriceId: membership.paddlePriceId,
  })
}
