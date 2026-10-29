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
  deepMinutes?: number | undefined
  remMinutes?: number | undefined
  lightMinutes?: number | undefined
  awakeMinutes?: number | undefined
  efficiency?: number | undefined // 0..100
  score?: number | undefined // 0..100 when the device provides one
  source: HealthPlatform
  recordedAt: string
}

/** One GPS sample from a watch-recorded workout route. */
export interface RoutePoint {
  lat: number;
  lng: number;
  alt?: number | undefined;
  timestamp: string; // ISO
  accuracy?: number | undefined; // meters
}

/**
 * A run recorded on the athlete's watch, ready for POST /running/sessions/import.
 * `externalId` is the device's own workout id — it is what makes re-syncing the
 * same window idempotent instead of duplicating runs.
 */
export interface DeviceActivity {
  externalId: string;
  /** Canonical origin resolved by device-identity, not the raw platform string. */
  source: import('./device-identity').RecordingSource;
  deviceName: string;
  deviceBrand: string;
  date: string; // YYYY-MM-DD
  distanceKm: number;
  durationSec: number;
  calories: number;
  elevationM?: number | undefined;
  heartRate?: number | undefined;
  cadence?: number | undefined;
  route: RoutePoint[];
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
  /**
   * Runs recorded by the watch since the given epoch ms, with their GPS route
   * and the device that recorded them. Empty when the platform owns sync
   * server-side (Garmin) or no workout permission was granted.
   */
  readWorkoutsSince(sinceMs: number): Promise<DeviceActivity[]>
}

export class HealthBridgeUnavailableError extends Error {
  constructor(platform: string) {
    super(`${platform} is not available on this device`)
    this.name = 'HealthBridgeUnavailableError'
  }
}
