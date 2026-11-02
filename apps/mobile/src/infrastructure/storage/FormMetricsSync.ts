/**
 * FormMetricsSync — Syncs form metrics to the Go API.
 *
 * Lightweight JSON sync — no video data.
 * Coach receives metrics for analysis and feedback.
 *
 * IMPORTANT: All communication goes through the Go API (apps/api).
 * This is the single source of truth for all data.
 */
import {
  getAllMetrics,
  clearMetrics,
} from './FormMetricsStorage'
import { smartClient } from '../api/client'

type SyncResult = {
  synced: number
  failed: number
  errors: string[]
}

/**
 * Sync all form metrics to the Go API
 */
export async function syncFormMetrics(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0, errors: [] }

  try {
    const metrics = await getAllMetrics()
    if (metrics.length === 0) return result

    // Transform to API format
    const apiMetrics = metrics.map(m => ({
      id: m.id,
      exercise_id: m.exerciseId,
      exercise_name: m.exerciseName,
      workout_id: m.workoutId,
      form_score: m.formScore,
      depth: m.depth,
      alignment: m.alignment,
      tempo: m.tempo,
      recorded_at: m.timestamp,
    }))

    // Send batch to Go API via smartClient (adds Clerk JWT Authorization header).
    // smartClient baseURL is `${GO_API_URL}/api/v1`, so path is relative to /api/v1.
    const { data } = await smartClient.post<{ success: boolean; data: { synced: number } }>(
      '/form-metrics/sync',
      { metrics: apiMetrics },
    )

    if (data.success) {
      await clearMetrics()
      result.synced = data.data?.synced || metrics.length
    } else {
      result.failed = metrics.length
      result.errors.push('Sync failed')
    }
  } catch (err) {
    const metrics = await getAllMetrics()
    result.failed = metrics.length
    const status = (err as { response?: { status?: number } })?.response?.status
    result.errors.push(
      status
        ? `Server returned ${status}`
        : err instanceof Error
          ? err.message
          : 'Unknown error',
    )
  }

  return result
}

/**
 * Sync in background (fire-and-forget)
 */
export async function syncAfterWorkout(): Promise<void> {
  try {
    const result = await syncFormMetrics()
    if (result.synced > 0) {
      console.log(`[FormMetricsSync] Synced ${result.synced} metrics`)
    }
    if (result.failed > 0) {
      console.warn(`[FormMetricsSync] Failed ${result.failed} metrics`)
    }
  } catch (err) {
    console.error('[FormMetricsSync] Background sync failed:', err)
  }
}
