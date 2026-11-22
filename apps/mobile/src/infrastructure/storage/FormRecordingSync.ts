/**
 * FormRecordingSync — Uploads pending form videos to the Go API.
 *
 * Uses the camera's recorded temp files directly.
 * Cleans up metadata after successful sync.
 *
 * IMPORTANT: All communication goes through the Go API (apps/api) via
 * smartClient, which attaches the Clerk JWT Authorization header.
 * smartClient baseURL is `${GO_API_URL}/api/v1`, so paths are relative
 * to /api/v1. Never fetch the Next.js API from mobile.
 */
import {
  getPendingVideos,
  removePendingVideo,
  type PendingFormVideo,
} from './LocalVideoStorage'
import { smartClient } from '../api/client'
import { uploadMediaToR2 } from '../../shared/media/mediaService'

const MAX_RETRIES = 2

type SyncResult = {
  synced: number
  failed: number
  errors: string[]
}

/**
 * Upload a single video to R2 and register its media_ref with the Go API.
 */
async function uploadVideo(video: PendingFormVideo): Promise<boolean> {
  try {
    const { mediaRef } = await uploadMediaToR2(video.tempPath, 'form_recording', {
      filename: `form_${video.exerciseId}_${video.id}.mp4`,
      contentType: 'video/mp4',
      resourceId: video.workoutId ?? video.exerciseId,
    })

    const response = await smartClient.post('/form-recordings/upload', {
      exerciseId: video.exerciseId,
      ...(video.workoutId ? { workoutId: video.workoutId } : {}),
      formScore: video.formScore,
      formMetrics: video.formMetrics,
      video_url: mediaRef,
    })

    return response.status >= 200 && response.status < 300
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
