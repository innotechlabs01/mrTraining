/**
 * DEPRECATED (T-009.1) — dead video path.
 *
 * These helpers read/write the `exercise_videos` table, which is no longer
 * consumed by anything: the Go API never queries it and mobile has no reader.
 * The live demo-video source is `exercise_library.video_url`, written through
 * the Go API (POST/PUT /api/v1/exercises).
 *
 * Kept for reference only; do not add new callers. Removal (including the
 * table drop) is a separate ticket requiring explicit approval.
 * See docs/superpowers/specs/2026-10-12-T-009-T-010-exercise-video-and-profile-422-design.md §2.1.
 */
import { getDB, generateId } from './db'

export interface ExerciseVideo {
  id: string
  exerciseId: string
  coachId: string
  title: string
  description: string | null
  videoUrl: string
  durationSec: number | null
  fileSizeBytes: number
  createdAt: string
  updatedAt: string
}

export async function listExerciseVideos(exerciseId: string): Promise<ExerciseVideo[]> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM exercise_videos WHERE exercise_id = ? ORDER BY created_at DESC',
    [exerciseId]
  )
  return result.rows.map((r) => ({
    id: r.id as string,
    exerciseId: r.exercise_id as string,
    coachId: r.coach_id as string,
    title: r.title as string,
    description: r.description as string | null,
    videoUrl: r.video_url as string,
    durationSec: r.duration_sec as number | null,
    fileSizeBytes: r.file_size_bytes as number,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }))
}

export async function saveExerciseVideo(data: Omit<ExerciseVideo, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExerciseVideo> {
  const db = getDB()
  const now = new Date().toISOString()
  const video: ExerciseVideo = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  }
  await db.execute(
    `INSERT INTO exercise_videos (id, exercise_id, coach_id, title, description, video_url, duration_sec, file_size_bytes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [video.id, video.exerciseId, video.coachId, video.title, video.description, video.videoUrl, video.durationSec, video.fileSizeBytes, video.createdAt, video.updatedAt]
  )
  return video
}

export async function deleteExerciseVideo(id: string, coachId: string): Promise<void> {
  const db = getDB()
  await db.execute(
    'DELETE FROM exercise_videos WHERE id = ? AND coach_id = ?',
    [id, coachId]
  )
}