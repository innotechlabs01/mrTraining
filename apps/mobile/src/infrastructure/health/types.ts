/**
 * Health data bridge — the platform-agnostic contract between wearable sources and the
 * sync engine. iOS reads through HealthKit, Android through Health Connect; both
 * normalize into these shapes so nothing downstream knows which watch produced a number.
 */

export type HealthPlatform = 'healthkit' | 'healthconnect' | 'garmin'

export type MetricType =
  | 'resting_hr'
  | 'hrv'
  | 'steps'
  | 'vo2max'
  | 'active_calories'
  | 'workout_duration'

export interface DeviceInfo {
  platform: HealthPlatform
  name: string
  brand: string
}

/** One normalized measurement ready for POST /api/athlete/health/metrics. */
export interface HealthMetric {
  metricType: MetricType
  value: number
  unit: string
  source: HealthPlatform
  recordedAt: string // ISO timestamp from the watch
}

/** One reference night of sleep, with stage detail when the device provides it. */
export interface SleepLog {
  date: string // YYYY-MM-DD reference night
  totalMinutes: number
  deepMinutes?: number
  remMinutes?: number
  lightMinutes?: number
  awakeMinutes?: number
  efficiency?: number // 0..100
  score?: number // 0..100 when the device provides one
  source: HealthPlatform
  recordedAt: string
}

export interface HealthBridge {
  readonly platform: HealthPlatform
  /** Whether this platform exists on the current device (iOS vs Android check). */
  isAvailable(): Promise<boolean>
  /** Request read permissions; returns false when denied or unavailable. */
  requestPermissions(): Promise<boolean>
  /** Whether permissions were already granted (no prompt). */
  hasPermissions(): Promise<boolean>
  /** Read metrics since the given epoch ms (incremental syncs). */
  readMetricsSince(sinceMs: number): Promise<HealthMetric[]>
  /** The most recent completed night of sleep, if any. */
  readLastNightSleep(): Promise<SleepLog | null>
}

export class HealthBridgeUnavailableError extends Error {
  constructor(platform: string) {
    super(`${platform} is not available on this device`)
    this.name = 'HealthBridgeUnavailableError'
  }
}
