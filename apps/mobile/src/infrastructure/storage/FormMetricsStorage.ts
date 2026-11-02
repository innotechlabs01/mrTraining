/**
 * FormMetricsStorage — Stores form analysis metrics locally (JSON only).
 *
 * No video is stored — only lightweight metrics:
 * - exercise ID/name
 * - form score (0-100)
 * - depth, alignment, tempo metrics
 * - timestamp
 * - workout ID
 *
 * Storage: MMKV, namespaced per user (`<base>:<userId>`). Consent granted
 * pre-auth lands on the `:anon` key; the reader falls back to it so the
 * decision is not re-asked after sign-in.
 *
 * Synced to server after workout. Coach sees trends and areas for improvement.
 */
import { mmkv, mmkvGetJson, mmkvRemove, mmkvSetJson, userScopedKey } from './mmkv'

const METRICS_KEY = '@mr/form_metrics'
const CONSENT_KEY = '@mr/form_recording_consent'

export type FormMetricEntry = {
  id: string
  exerciseId: string
  exerciseName: string
  workoutId?: string | undefined
  formScore: number
  depth: number
  alignment: number
  tempo: number
  timestamp: string
}

// ============== Consent ==============

export type ConsentState = 'pending' | 'accepted' | 'denied'

function readConsentValue(userKey: string): string | undefined {
  return mmkv.getString(userKey) ?? mmkv.getString(`${CONSENT_KEY}:anon`)
}

export async function getConsentState(): Promise<ConsentState> {
  try {
    const value = readConsentValue(userScopedKey(CONSENT_KEY))
    if (value === 'accepted') return 'accepted'
    if (value === 'denied') return 'denied'
    return 'pending'
  } catch {
    return 'pending'
  }
}

export async function setConsentState(state: ConsentState): Promise<void> {
  mmkv.set(userScopedKey(CONSENT_KEY), state)
}

// ============== Metrics Storage ==============

/**
 * Save a form metric entry (after each set)
 */
export async function saveFormMetric(entry: Omit<FormMetricEntry, 'id' | 'timestamp'>): Promise<FormMetricEntry> {
  const metric: FormMetricEntry = {
    ...entry,
    id: `fm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
  }

  const existing = await getAllMetrics()
  existing.push(metric)
  mmkvSetJson(userScopedKey(METRICS_KEY), existing)

  return metric
}

/**
 * Get all stored metrics
 */
export async function getAllMetrics(): Promise<FormMetricEntry[]> {
  try {
    return mmkvGetJson<FormMetricEntry[]>(userScopedKey(METRICS_KEY)) ?? []
  } catch {
    return []
  }
}

/**
 * Get metrics count
 */
export async function getMetricsCount(): Promise<number> {
  const metrics = await getAllMetrics()
  return metrics.length
}

/**
 * Clear all metrics (after successful sync)
 */
export async function clearMetrics(): Promise<void> {
  mmkvRemove(userScopedKey(METRICS_KEY))
}

/**
 * Get metrics for a specific exercise
 */
export async function getMetricsForExercise(exerciseId: string): Promise<FormMetricEntry[]> {
  const all = await getAllMetrics()
  return all.filter((m) => m.exerciseId === exerciseId)
}

/**
 * Get average score for an exercise
 */
export async function getAverageScore(exerciseId: string): Promise<number> {
  const metrics = await getMetricsForExercise(exerciseId)
  if (metrics.length === 0) return 0
  const sum = metrics.reduce((acc, m) => acc + m.formScore, 0)
  return Math.round(sum / metrics.length)
}
