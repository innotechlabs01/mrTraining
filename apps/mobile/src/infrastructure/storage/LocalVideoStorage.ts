/**
 * LocalVideoStorage — Tracks form recording videos pending sync.
 *
 * Videos are recorded to temp files by the camera.
 * Metadata is stored in MMKV (user-scoped) for sync tracking.
 * After sync, metadata is cleaned up.
 */
import { mmkvGetJson, mmkvRemove, mmkvSetJson, userScopedKey } from './mmkv'

const PENDING_VIDEOS_KEY = '@mr/pending_form_videos'

export type PendingFormVideo = {
  id: string
  exerciseId: string
  exerciseName: string
  workoutId?: string
  tempPath: string
  durationSec: number
  formScore: number
  formMetrics: { depth: number; alignment: number; tempo: number }
  createdAt: string
}

/**
 * Get all pending videos
 */
export async function getPendingVideos(): Promise<PendingFormVideo[]> {
  try {
    return mmkvGetJson<PendingFormVideo[]>(userScopedKey(PENDING_VIDEOS_KEY)) ?? []
  } catch {
    return []
  }
}

/**
 * Add a video to pending list
 */
export async function addPendingVideo(video: PendingFormVideo): Promise<void> {
  const pending = await getPendingVideos()
  pending.push(video)
  mmkvSetJson(userScopedKey(PENDING_VIDEOS_KEY), pending)
}

/**
 * Remove a video from pending list
 */
export async function removePendingVideo(videoId: string): Promise<void> {
  const pending = await getPendingVideos()
  const updated = pending.filter((v) => v.id !== videoId)
  mmkvSetJson(userScopedKey(PENDING_VIDEOS_KEY), updated)
}

/**
 * Get count of pending videos
 */
export async function getPendingCount(): Promise<number> {
  const pending = await getPendingVideos()
  return pending.length
}

/**
 * Clear all pending videos (after successful sync)
 */
export async function clearPendingVideos(): Promise<void> {
  mmkvRemove(userScopedKey(PENDING_VIDEOS_KEY))
}
