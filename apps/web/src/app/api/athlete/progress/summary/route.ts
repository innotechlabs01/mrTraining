import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('start_date') ?? new Date().toISOString().slice(0,10)
  const endDate = searchParams.get('end_date') ?? new Date().toISOString().slice(0,10)

  // TODO: replace with real aggregation from DB
  const summary = {
    athleteId: userId,
    startDate,
    endDate,
    workoutsCompleted: 0,
    totalVolume: 0,
    avgCompletionRate: 0,
    streak: 0,
  }

  return NextResponse.json(summary)
}
