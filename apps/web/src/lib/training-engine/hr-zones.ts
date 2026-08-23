/**
 * HR zone computation from raw heart rate samples.
 *
 * Standard 5-zone model based on % of max HR (220 - age or measured).
 * Zone thresholds are configurable per athlete; defaults apply if not set.
 *
 * Zone 1: 50-60%  warm-up / recovery
 * Zone 2: 60-70%  aerobic base / fat burn
 * Zone 3: 70-80%  tempo / aerobic power
 * Zone 4: 80-90%  anaerobic threshold
 * Zone 5: 90-100% VO2max / maximum
 */

export interface HRZoneInput {
  bpm: number
  timestamp: string // ISO
}

export interface HRZoneDistribution {
  zone1: number // seconds in zone 1
  zone2: number
  zone3: number
  zone4: number
  zone5: number
  totalTime: number // total seconds with valid HR
  avgBpm: number | null
  maxBpm: number | null
  estimatedMaxHr: number
}

const ZONE_THRESHOLDS = [0.50, 0.60, 0.70, 0.80, 0.90, 1.01] // upper bounds

/** Estimate max HR from age (default 220-age; if no age, use 190 as reasonable default). */
export function estimatedMaxHr(age?: number | null): number {
  if (age && age > 0 && age < 120) return Math.round(220 - age)
  return 190
}

/** Classify a single BPM value into zone 1-5. */
function classifyZone(bpm: number, maxHr: number): number {
  const pct = bpm / maxHr
  for (let i = 0; i < ZONE_THRESHOLDS.length; i++) {
    if (pct < ZONE_THRESHOLDS[i]) return i + 1
  }
  return 5 // >= 100% (can happen with measurement noise)
}

/**
 * Compute HR zone distribution from a list of HR samples.
 * Samples should be sorted by timestamp ascending. Each sample's contribution
 * is the seconds until the next sample (last sample contributes a default 5 seconds).
 */
export function computeHrZones(
  samples: HRZoneInput[],
  maxHrOverride?: number,
  age?: number | null,
): HRZoneDistribution {
  const maxHr = maxHrOverride ?? estimatedMaxHr(age)
  const zones = [0, 0, 0, 0, 0] // zone 1-5
  let totalTime = 0
  let sumBpm = 0
  let maxBpm = 0
  let count = 0

  for (let i = 0; i < samples.length; i++) {
    const bpm = samples[i].bpm
    if (bpm <= 0 || !Number.isFinite(bpm)) continue

    // Time contribution: seconds until next sample, or 5s default for last.
    const nextTs = i < samples.length - 1
      ? new Date(samples[i + 1].timestamp).getTime()
      : new Date(samples[i].timestamp).getTime() + 5000
    const dt = Math.max(1, Math.round((nextTs - new Date(samples[i].timestamp).getTime()) / 1000))

    const zone = classifyZone(bpm, maxHr)
    zones[zone - 1] += dt
    totalTime += dt
    sumBpm += bpm
    count++
    if (bpm > maxBpm) maxBpm = bpm
  }

  return {
    zone1: zones[0],
    zone2: zones[1],
    zone3: zones[2],
    zone4: zones[3],
    zone5: zones[4],
    totalTime,
    avgBpm: count > 0 ? Math.round(sumBpm / count) : null,
    maxBpm: maxBpm > 0 ? maxBpm : null,
    estimatedMaxHr: maxHr,
  }
}
