/**
 * GET /api/athlete/form-recordings — List form recordings for athlete.
 * GET /api/athlete/form-recordings/[id] — Get a single recording.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { listFormRecordings, getFormRecording } from '@/lib/db/video-metrics'
import { getDB, mapRow } from '@/lib/db/db'
import type { InValue } from '@libsql/client'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (id) {
      const recording = await getFormRecording(id)
      if (!recording) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(recording)
    }

    // List recordings for this athlete
    const db = getDB()
    const result = await db.execute(
      `SELECT afr.*, el.name as exercise_name
       FROM athlete_form_recordings afr
       JOIN exercise_library el ON afr.exercise_id = el.id
       WHERE afr.athlete_id = ?
       ORDER BY afr.created_at DESC
       LIMIT 50`,
      [userId] as InValue[],
    )
    return NextResponse.json(result.rows.map(mapRow(result.columns)))
  } catch (error) {
    console.error('Error listing form recordings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
