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
 * Synced to server after workout. Coach sees trends and areas for improvement.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'

const METRICS_KEY = '@mr/form_metrics'
const CONSENT_KEY = '@mr/form_recording_consent'

export type FormMetricEntry = {
  id: string
  exerciseId: string
  exerciseName: string
  workoutId?: string
  formScore: number
  depth: number
  alignment: number
  tempo: number
  timestamp: string
}

// ============== Consent ==============

export type ConsentState = 'pending' | 'accepted' | 'denied'

export async function getConsentState(): Promise<ConsentState> {
  try {
    const value = await AsyncStorage.getItem(CONSENT_KEY)
    if (value === 'accepted') return 'accepted'
    if (value === 'denied') return 'denied'
    return 'pending'
  } catch {
    return 'pending'
  }
}

export async function setConsentState(state: ConsentState): Promise<void> {
  await AsyncStorage.setItem(CONSENT_KEY, state)
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
  await AsyncStorage.setItem(METRICS_KEY, JSON.stringify(existing))

  return metric
}

/**
 * Get all stored metrics
 */
export async function getAllMetrics(): Promise<FormMetricEntry[]> {
  try {
    const data = await AsyncStorage.getItem(METRICS_KEY)
    if (!data) return []
    return JSON.parse(data) as FormMetricEntry[]
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
  await AsyncStorage.removeItem(METRICS_KEY)
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
