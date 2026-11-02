import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = params

  // TODO: replace with real fetch from DB
  const data = {
    id: sessionId,
    athleteId: userId,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    exercises: [],
  }

  return NextResponse.json(data)
}
