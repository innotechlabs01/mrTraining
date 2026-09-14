/**
 * POST /api/athlete/video-metrics — Log a video view session.
 *
 * Body:
 *   - videoId: string
 *   - videoType: 'demo' | 'form' | 'feedback'
 *   - durationSec: number
 *   - maxPositionSec: number
 *   - completedPct: number
 *   - pauseCount: number
 *   - replayCount: number
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { logVideoView } from '@/lib/db/video-metrics'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { videoId, videoType, durationSec, maxPositionSec, completedPct, pauseCount, replayCount } = body

    if (!videoId || !videoType) {
      return NextResponse.json({ error: 'Missing videoId or videoType' }, { status: 400 })
    }

    const metrics = await logVideoView({
      videoId,
      videoType,
      athleteId: userId,
      durationSec: durationSec || 0,
      maxPositionSec: maxPositionSec || 0,
      completedPct: completedPct || 0,
      pauseCount: pauseCount || 0,
      replayCount: replayCount || 0,
    })

    return NextResponse.json(metrics, { status: 201 })
  } catch (error) {
    console.error('Error logging video metrics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
