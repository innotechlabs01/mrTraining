/**
 * LocalVideoStorage — Tracks form recording videos pending sync.
 *
 * Videos are recorded to temp files by the camera.
 * Metadata is stored in AsyncStorage for sync tracking.
 * After sync, metadata is cleaned up.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'

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
    const data = await AsyncStorage.getItem(PENDING_VIDEOS_KEY)
    if (!data) return []
    return JSON.parse(data) as PendingFormVideo[]
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
  await AsyncStorage.setItem(PENDING_VIDEOS_KEY, JSON.stringify(pending))
}

/**
 * Remove a video from pending list
 */
export async function removePendingVideo(videoId: string): Promise<void> {
  const pending = await getPendingVideos()
  const updated = pending.filter((v) => v.id !== videoId)
  await AsyncStorage.setItem(PENDING_VIDEOS_KEY, JSON.stringify(updated))
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
  await AsyncStorage.removeItem(PENDING_VIDEOS_KEY)
}
