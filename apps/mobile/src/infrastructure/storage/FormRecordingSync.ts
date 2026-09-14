/**
 * FormRecordingSync — Uploads pending form videos to the server.
 *
 * Uses the camera's recorded temp files directly.
 * Cleans up metadata after successful sync.
 */
import {
  getPendingVideos,
  removePendingVideo,
  clearPendingVideos,
  type PendingFormVideo,
} from './LocalVideoStorage'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
const MAX_RETRIES = 2

type SyncResult = {
  synced: number
  failed: number
  errors: string[]
}

/**
 * Upload a single video to the server
 */
async function uploadVideo(video: PendingFormVideo): Promise<boolean> {
  try {
    const formData = new FormData()
    formData.append('file', {
      uri: video.tempPath,
      type: 'video/mp4',
      name: `form_${video.exerciseId}_${video.id}.mp4`,
    } as unknown as Blob)
    formData.append('exerciseId', video.exerciseId)
    formData.append('formScore', String(video.formScore))
    formData.append('formMetrics', JSON.stringify(video.formMetrics))
    if (video.workoutId) {
      formData.append('workoutId', video.workoutId)
    }

    const response = await fetch(`${API_BASE}/api/athlete/form-recordings/upload`, {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return response.ok
  } catch (err) {
    console.error('Upload error:', err)
    return false
  }
}

/**
 * Sync all pending videos to the server
 */
export async function syncPendingVideos(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0, errors: [] }
  const pending = await getPendingVideos()

  if (pending.length === 0) return result

  for (const video of pending) {
    let success = false
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      success = await uploadVideo(video)
      if (success) break
      // Small delay between retries
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 1000))
      }
    }

    if (success) {
      await removePendingVideo(video.id)
      result.synced++
    } else {
      result.failed++
      result.errors.push(`Failed: ${video.exerciseName}`)
    }
  }

  return result
}

/**
 * Sync pending videos in background (fire-and-forget)
 */
export async function syncAfterWorkout(): Promise<void> {
  try {
    const result = await syncPendingVideos()
    if (result.synced > 0) {
      console.log(`[FormRecordingSync] Synced ${result.synced} videos`)
    }
    if (result.failed > 0) {
      console.warn(`[FormRecordingSync] Failed ${result.failed} videos`)
    }
  } catch (err) {
    console.error('[FormRecordingSync] Background sync failed:', err)
  }
}
