/**
 * Video Metrics DB functions — Turso/LibSQL
 *
 * Tracks athlete video engagement:
 * - Which demo videos they watch
 * - Watch duration, pause points, replays
 * - Completion rate
 * - Best/worst performers per exercise
 */
import { getDB, generateId, mapRow, safeExecute } from './db'
import type { InValue } from '@libsql/client'

// ─────────────────────────────────────────────────────
//  Exercise Demo Videos (coach uploads)
// ─────────────────────────────────────────────────────

/** List demo videos for an exercise. */
export async function listExerciseVideos(exerciseId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM exercise_videos WHERE exercise_id = ? ORDER BY created_at DESC',
    [exerciseId] as InValue[],
  )
  return result.rows.map(mapRow(result.columns))
}

/** Save a new exercise video (URL already uploaded to Vercel). */
export async function saveExerciseVideo(data: {
  exerciseId: string
  coachId: string
  title: string
  description?: string
  videoUrl: string
  thumbnailUrl?: string
  durationSec?: number
  fileSizeBytes?: number
}) {
  const db = getDB()
  const id = generateId()
  await safeExecute(db,
    `INSERT INTO exercise_videos (id, exercise_id, coach_id, title, description, video_url, thumbnail_url, duration_sec, file_size_bytes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.exerciseId, data.coachId, data.title, data.description || null, data.videoUrl, data.thumbnailUrl || null, data.durationSec || null, data.fileSizeBytes || null],
  )
  return { id, ...data }
}

/** Delete an exercise video. */
export async function deleteExerciseVideo(id: string, coachId: string) {
  const db = getDB()
  await safeExecute(db, 'DELETE FROM exercise_videos WHERE id = ? AND coach_id = ?', [id, coachId])
}

// ─────────────────────────────────────────────────────
//  Athlete Form Recordings
// ─────────────────────────────────────────────────────

/** Save a form recording (athlete uploads video of themselves). */
export async function saveFormRecording(data: {
  exerciseId: string
  athleteId: string
  workoutId?: string
  videoUrl: string
  thumbnailUrl?: string
  durationSec?: number
  fileSizeBytes?: number
}) {
  const db = getDB()
  const id = generateId()
  await safeExecute(db,
    `INSERT INTO athlete_form_recordings (id, exercise_id, athlete_id, workout_id, video_url, thumbnail_url, duration_sec, file_size_bytes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.exerciseId, data.athleteId, data.workoutId || null, data.videoUrl, data.thumbnailUrl || null, data.durationSec || null, data.fileSizeBytes || null],
  )
  return { id, ...data }
}

/** List form recordings for a coach's athletes. */
export async function listFormRecordings(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    `SELECT afr.*, a.name as athlete_name, el.name as exercise_name
     FROM athlete_form_recordings afr
     JOIN coach_athletes a ON afr.athlete_id = a.id
     JOIN exercise_library el ON afr.exercise_id = el.id
     WHERE a.coach_id = ?
     ORDER BY afr.created_at DESC
     LIMIT 100`,
    [coachId] as InValue[],
  )
  return result.rows.map(mapRow(result.columns))
}

/** Get a single form recording by ID. */
export async function getFormRecording(id: string) {
  const db = getDB()
  const result = await db.execute(
    `SELECT afr.*, a.name as athlete_name, el.name as exercise_name
     FROM athlete_form_recordings afr
     JOIN coach_athletes a ON afr.athlete_id = a.id
     JOIN exercise_library el ON afr.exercise_id = el.id
     WHERE afr.id = ?`,
    [id] as InValue[],
  )
  if (result.rows.length === 0) return null
  return mapRow(result.columns)(result.rows[0])
}

/** Update coach feedback on a recording. */
export async function updateFormRecordingFeedback(
  id: string,
  feedback: { coachFeedback?: string; coachRating?: number; status?: string }
) {
  const db = getDB()
  const updates: string[] = []
  const params: unknown[] = []
  if (feedback.coachFeedback !== undefined) { updates.push('coach_feedback = ?'); params.push(feedback.coachFeedback) }
  if (feedback.coachRating !== undefined) { updates.push('coach_rating = ?'); params.push(feedback.coachRating) }
  if (feedback.status !== undefined) { updates.push('status = ?'); params.push(feedback.status) }
  if (updates.length === 0) return
  params.push(id)
  await safeExecute(db, `UPDATE athlete_form_recordings SET ${updates.join(', ')} WHERE id = ?`, params)
}

// ─────────────────────────────────────────────────────
//  Video View Metrics
// ─────────────────────────────────────────────────────

/** Log a video view session. */
export async function logVideoView(data: {
  videoId: string
  videoType: 'demo' | 'form' | 'feedback'
  athleteId: string
  durationSec: number
  maxPositionSec: number
  completedPct: number
  pauseCount: number
  replayCount: number
}) {
  const db = getDB()
  const id = generateId()
  await safeExecute(db,
    `INSERT INTO video_view_metrics (id, video_id, video_type, athlete_id, duration_sec, max_position_sec, completed_pct, pause_count, replay_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.videoId, data.videoType, data.athleteId, data.durationSec, data.maxPositionSec, data.completedPct, data.pauseCount, data.replayCount],
  )
  return { id }
}

/** Get video metrics for an exercise (best/worst per athlete). */
export async function getVideoMetricsForExercise(exerciseId: string) {
  const db = getDB()
  const result = await db.execute(
    `SELECT
       athlete_id,
       athlete_name,
       exercise_name,
       AVG(completed_pct) as avg_completion,
       MAX(completed_pct) as best_completion,
       MIN(completed_pct) as worst_completion,
       AVG(pause_count) as avg_pauses,
       AVG(replay_count) as avg_replays,
       COUNT(*) as view_count
     FROM (
       SELECT
         m.id, m.athlete_id, m.completed_pct, m.pause_count, m.replay_count,
         a.name as athlete_name,
         el.name as exercise_name
       FROM video_view_metrics m
       JOIN coach_athletes a ON m.athlete_id = a.id
       LEFT JOIN exercise_videos ev ON m.video_id = ev.id AND m.video_type = 'demo'
       LEFT JOIN athlete_form_recordings afr ON m.video_id = afr.id AND m.video_type = 'form'
       LEFT JOIN exercise_library el ON ev.exercise_id = el.id OR afr.exercise_id = el.id
       WHERE ev.exercise_id = ? OR afr.exercise_id = ?
     )
     GROUP BY athlete_id, athlete_name, exercise_name`,
    [exerciseId, exerciseId] as InValue[],
  )
  return result.rows.map(mapRow(result.columns))
}

/** Get best/worst video performance per athlete for coach dashboard. */
export async function getAthleteVideoPerformance(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    `SELECT
       a.id as athlete_id,
       a.name as athlete_name,
       el.name as exercise_name,
       el.id as exercise_id,
       -- Best video
       MAX(m.completed_pct) as best_completion,
       -- Worst video
       MIN(m.completed_pct) as worst_completion,
       -- Average metrics
       ROUND(AVG(m.completed_pct), 1) as avg_completion,
       ROUND(AVG(m.pause_count), 1) as avg_pauses,
       ROUND(AVG(m.replay_count), 1) as avg_replays,
       ROUND(AVG(m.duration_sec), 1) as avg_watch_time,
       COUNT(*) as total_views
     FROM video_view_metrics m
     JOIN coach_athletes a ON m.athlete_id = a.id
     LEFT JOIN exercise_videos ev ON m.video_id = ev.id AND m.video_type = 'demo'
     LEFT JOIN athlete_form_recordings afr ON m.video_id = afr.id AND m.video_type = 'form'
     LEFT JOIN exercise_library el ON ev.exercise_id = el.id OR afr.exercise_id = el.id
     WHERE a.coach_id = ?
     GROUP BY a.id, a.name, el.name, el.id
     ORDER BY a.name, el.name`,
    [coachId] as InValue[],
  )
  return result.rows.map(mapRow(result.columns))
}
