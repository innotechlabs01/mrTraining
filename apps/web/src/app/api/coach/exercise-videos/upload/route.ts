/**
 * DEPRECATED (T-009.1) — dead video path. This route writes to the
 * `exercise_videos` table, which the Go API never reads and mobile never
 * consumes, so uploads here are invisible to athletes. The live demo-video
 * source is `exercise_library.video_url` via POST/PUT /api/v1/exercises.
 * Kept for reference; do not add new callers. Removal is a separate ticket
 * requiring explicit approval.
 * See docs/superpowers/specs/2026-10-12-T-009-T-010-exercise-video-and-profile-422-design.md §2.1.
 *
 * POST /api/coach/exercise-videos/upload — Upload a demo video for an exercise.
 *
 * Body: multipart/form-data
 *   - file: video (mp4, mov, webm — max 50MB)
 *   - exerciseId: string
 *   - title: string
 *   - description?: string
 *
 * Flow:
 * 1. Validate auth (coach role)
 * 2. Upload to Vercel Blob
 * 3. Save URL + metadata to exercise_videos table
 * 4. Return video record
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { put } from '@vercel/blob'
import { saveExerciseVideo } from '@/lib/db/video-metrics'

const MAX_SIZE = 50 * 1024 * 1024
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const exerciseId = formData.get('exerciseId') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string | null

    if (!file || !exerciseId || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.some(t => file.type.includes(t))) {
      return NextResponse.json({ error: 'Unsupported video format' }, { status: 400 })
    }

    const ext = file.type.split('/')[1] || 'mp4'
    const blob = await put(`exercise-videos/${exerciseId}/${Date.now()}.${ext}`, file, {
      access: 'public',
      contentType: file.type,
    })

    const video = await saveExerciseVideo({
      exerciseId,
      coachId: userId,
      title,
      description: description || null,
      videoUrl: blob.url,
      durationSec: null,
      fileSizeBytes: file.size,
    })

    return NextResponse.json(video, { status: 201 })
  } catch (error) {
    console.error('Error uploading exercise video:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
