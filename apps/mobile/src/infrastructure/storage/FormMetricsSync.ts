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
import {
  computeBackoffMs,
  createCorrelationId,
  extractAxiosStatus,
  isCircuitBreakerOpenError,
  isTransientAxiosError,
  sleepMs,
} from '../api/resilience'

type SyncResult = {
  synced: number
  failed: number
  errors: string[]
}

export interface FormMetricsSyncOptions {
  maxAttempts?: number
  sleepFn?: (ms: number) => Promise<void>
}

let inFlightSync: Promise<SyncResult> | null = null

export function computeBatchIdempotencyKey(metricIds: string[]): string {
  const sorted = [...metricIds].sort().join('|')
  let h1 = 0x811c9dc5
  let h2 = 0x9e3779b9
  for (let i = 0; i < sorted.length; i += 1) {
    const c = sorted.charCodeAt(i)
    h1 ^= c
    h1 = Math.imul(h1, 0x01000193)
    h2 ^= c
    h2 = Math.imul(h2, 0x85ebca6b)
  }
  return `fm-${metricIds.length}-${(h1 >>> 0).toString(16)}-${(h2 >>> 0).toString(16)}`
}

async function runFormMetricsSync(options: FormMetricsSyncOptions = {}): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0, errors: [] }
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3)
  const sleep = options.sleepFn ?? sleepMs

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

  const idempotencyKey = computeBatchIdempotencyKey(metrics.map(m => m.id))
  const correlationId = createCorrelationId()

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      // Send batch to Go API via smartClient (adds Clerk JWT Authorization header).
      // Go API appresponse.Success returns { synced: number, failed: number }.
      // Also tolerate legacy { success: true, data: { synced } } envelope.
      const { data } = await smartClient.post<{
        synced?: number
        failed?: number
        success?: boolean
        data?: { synced?: number }
      }>(
        '/form-metrics/sync',
        { metrics: apiMetrics },
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
            'X-Correlation-ID': correlationId,
          },
        },
      )

      const syncedCount =
        typeof data?.synced === 'number'
          ? data.synced
          : typeof data?.data?.synced === 'number'
            ? data.data.synced
            : data?.success
              ? metrics.length
              : -1

      if (syncedCount >= 0) {
        await clearMetrics()
        result.synced = syncedCount
        return result
      }

      result.failed = metrics.length
      result.errors.push('Sync failed')
      return result
    } catch (err) {
      const status = extractAxiosStatus(err)
      const message = status
        ? `Server returned ${status}`
        : err instanceof Error
          ? err.message
          : 'Unknown error'

      if (isCircuitBreakerOpenError(err) || !isTransientAxiosError(err) || attempt === maxAttempts - 1) {
        result.failed = metrics.length
        result.errors.push(message)
        return result
      }

      await sleep(computeBackoffMs(attempt))
    }
  }

  return result
}

/**
 * Sync all form metrics to the Go API (single-flight lock + bounded transient retry).
 */
export async function syncFormMetrics(options?: FormMetricsSyncOptions): Promise<SyncResult> {
  if (inFlightSync) {
    return inFlightSync
  }

  inFlightSync = runFormMetricsSync(options).finally(() => {
    inFlightSync = null
  })
  return inFlightSync
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
