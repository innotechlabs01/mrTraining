// @ts-nocheck — libsql InValue type is too strict for Record<string, unknown> dynamic params.
import { getDB, generateId } from './db'

// ============== Athlete Health Metrics (wearables, migration 013) ==============

export type HealthPlatform = 'healthkit' | 'healthconnect' | 'garmin'

export type HealthDevice = {
  id: string
  athleteId: string
  platform: HealthPlatform
  deviceName: string
  deviceBrand: string
  isActive: boolean
  lastSyncAt: string | null
}

function mapHealthDevice(r: Record<string, unknown>): HealthDevice {
  return {
    id: r.id as string,
    athleteId: r.athlete_id as string,
    platform: r.platform as HealthPlatform,
    deviceName: (r.device_name as string) || '',
    deviceBrand: (r.device_brand as string) || '',
    isActive: r.is_active === 1 || r.is_active === true,
    lastSyncAt: (r.last_sync_at as string) || null,
  }
}

/** Register a device after native permissions are granted; one row per platform. */
export async function upsertHealthDevice(
  athleteId: string,
  data: { platform: HealthPlatform; deviceName?: string; deviceBrand?: string },
): Promise<HealthDevice> {
  const db = getDB()
  await db.execute(
    `INSERT INTO athlete_health_devices (id, athlete_id, platform, device_name, device_brand, is_active)
     VALUES (?,?,?,?,?,1)
     ON CONFLICT(athlete_id, platform) DO UPDATE SET
       device_name = excluded.device_name,
       device_brand = excluded.device_brand,
       is_active = 1`,
    [generateId(), athleteId, data.platform, data.deviceName ?? '', data.deviceBrand ?? ''],
  )
  const result = await db.execute(
    'SELECT * FROM athlete_health_devices WHERE athlete_id = ? AND platform = ?',
    [athleteId, data.platform],
  )
  return mapHealthDevice(result.rows[0])
}

export async function listHealthDevices(athleteId: string): Promise<HealthDevice[]> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM athlete_health_devices WHERE athlete_id = ? AND is_active = 1 ORDER BY created_at DESC',
    [athleteId],
  )
  return result.rows.map(mapHealthDevice)
}

/** Ownership-checked disconnect: device must belong to this athlete. */
export async function deactivateHealthDevice(athleteId: string, deviceId: string): Promise<boolean> {
  const db = getDB()
  const result = await db.execute(
    "UPDATE athlete_health_devices SET is_active = 0 WHERE id = ? AND athlete_id = ? AND is_active = 1",
    [deviceId, athleteId],
  )
  return (result.rowsAffected ?? 0) > 0
}

export type IncomingHealthMetric = {
  metricType: string
  value: number
  unit: string
  source: HealthPlatform
  sourceWorkoutId?: string | null
  recordedAt: string // ISO timestamp from the watch
}

/**
 * Batch-insert metrics with dedupe on (athlete, type, recorded_at). Returns how many
 * rows were actually inserted so re-syncs can report honestly.
 */
export async function insertHealthMetrics(athleteId: string, metrics: IncomingHealthMetric[]): Promise<number> {
  if (!metrics.length) return 0
  const db = getDB()
  let inserted = 0
  for (const m of metrics) {
    const result = await db.execute(
      `INSERT OR IGNORE INTO athlete_health_metrics
         (id, athlete_id, metric_type, value, unit, source, source_workout_id, recorded_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [generateId(), athleteId, m.metricType, m.value, m.unit, m.source, m.sourceWorkoutId ?? null, m.recordedAt],
    )
    inserted += result.rowsAffected ?? 0
  }
  return inserted
}

export type StoredHealthMetric = {
  metricType: string
  value: number
  unit: string
  source: string
  recordedAt: string
}

export async function getHealthMetrics(
  athleteId: string,
  opts: { metricType?: string; daysBack?: number } = {},
): Promise<StoredHealthMetric[]> {
  const db = getDB()
  const daysBack = opts.daysBack && opts.daysBack > 0 ? Math.min(opts.daysBack, 365) : 30
  const params: unknown[] = [athleteId]
  let where = 'WHERE athlete_id = ? AND recorded_at >= datetime(\'now\', ?)'
  params.push(`-${daysBack} days`)
  if (opts.metricType) {
    where += ' AND metric_type = ?'
    params.push(opts.metricType)
  }
  const result = await db.execute(
    `SELECT metric_type, value, unit, source, recorded_at FROM athlete_health_metrics ${where} ORDER BY recorded_at DESC`,
    params,
  )
  return result.rows.map(r => ({
    metricType: r.metric_type as string,
    value: r.value as number,
    unit: r.unit as string,
    source: r.source as string,
    recordedAt: r.recorded_at as string,
  }))
}

export type IncomingSleepLog = {
  date: string // YYYY-MM-DD reference night
  totalMinutes: number
  deepMinutes?: number | null
  remMinutes?: number | null
  lightMinutes?: number | null
  awakeMinutes?: number | null
  efficiency?: number | null
  score?: number | null
  source: HealthPlatform
  recordedAt: string
}

export async function upsertSleepLog(athleteId: string, log: IncomingSleepLog): Promise<void> {
  const db = getDB()
  await db.execute(
    `INSERT INTO athlete_sleep_logs
       (id, athlete_id, date, total_minutes, deep_minutes, rem_minutes, light_minutes,
        awake_minutes, efficiency, score, source, recorded_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(athlete_id, date, source) DO UPDATE SET
       total_minutes = excluded.total_minutes,
       deep_minutes = excluded.deep_minutes,
       rem_minutes = excluded.rem_minutes,
       light_minutes = excluded.light_minutes,
       awake_minutes = excluded.awake_minutes,
       efficiency = excluded.efficiency,
       score = excluded.score`,
    [
      generateId(), athleteId, log.date, log.totalMinutes,
      log.deepMinutes ?? null, log.remMinutes ?? null, log.lightMinutes ?? null,
      log.awakeMinutes ?? null, log.efficiency ?? null, log.score ?? null,
      log.source, log.recordedAt,
    ],
  )
}

export type StoredSleepLog = {
  date: string
  totalMinutes: number
  deepMinutes: number | null
  remMinutes: number | null
  lightMinutes: number | null
  awakeMinutes: number | null
  efficiency: number | null
  score: number | null
  source: string
}

export async function getSleepLogs(athleteId: string, daysBack = 30): Promise<StoredSleepLog[]> {
  const db = getDB()
  const days = daysBack && daysBack > 0 ? Math.min(daysBack, 365) : 30
  const result = await db.execute(
    `SELECT date, total_minutes, deep_minutes, rem_minutes, light_minutes, awake_minutes,
            efficiency, score, source
     FROM athlete_sleep_logs
     WHERE athlete_id = ? AND date >= date('now', ?)
     ORDER BY date DESC`,
    [athleteId, `-${days} days`],
  )
  return result.rows.map(r => ({
    date: r.date as string,
    totalMinutes: r.total_minutes as number,
    deepMinutes: (r.deep_minutes as number) ?? null,
    remMinutes: (r.rem_minutes as number) ?? null,
    lightMinutes: (r.light_minutes as number) ?? null,
    awakeMinutes: (r.awake_minutes as number) ?? null,
    efficiency: (r.efficiency as number) ?? null,
    score: (r.score as number) ?? null,
    source: r.source as string,
  }))
}

export async function markDeviceSynced(athleteId: string, platform: HealthPlatform): Promise<void> {
  const db = getDB()
  await db.execute(
    "UPDATE athlete_health_devices SET last_sync_at = datetime('now') WHERE athlete_id = ? AND platform = ?",
    [athleteId, platform],
  )
}
