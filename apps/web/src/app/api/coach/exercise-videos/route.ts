/**
 * GET /api/coach/exercise-videos?exerciseId=xxx — List demo videos for an exercise.
 * DELETE /api/coach/exercise-videos?id=xxx — Delete a video.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { listExerciseVideos, deleteExerciseVideo } from '@/lib/db/video-metrics'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const exerciseId = req.nextUrl.searchParams.get('exerciseId')
    if (!exerciseId) {
      return NextResponse.json({ error: 'exerciseId required' }, { status: 400 })
    }

    const videos = await listExerciseVideos(exerciseId)
    return NextResponse.json(videos)
  } catch (error) {
    console.error('Error listing exercise videos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    await deleteExerciseVideo(id, userId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting exercise video:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
