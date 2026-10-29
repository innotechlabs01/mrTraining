/**
 * Platform bridge factory + sync engine.
 * The engine reads incrementally from the native health platform, pushes to
 * /api/athlete/health/*, and remembers the last successful sync per platform so a
 * re-run only sends what is new. Nothing here invents data: no bridge, nothing synced.
 */
import { Platform } from 'react-native';
import { smartClient as apiClient } from '../api/client';
import { secureStorage } from '../storage/mmkv';
import type { HealthBridge, HealthPlatform } from './types';
import { toImportPayload } from './payload';
import { summarizeDevices, type RecordingDevice } from './devices';
import { HealthKitBridge } from './healthkit-bridge';
import { HealthConnectBridge } from './healthconnect-bridge';
import { GarminBridge } from './garmin-bridge';

const LAST_SYNC_KEY = 'health:lastSyncMs';

export function createHealthBridge(platform?: HealthPlatform): HealthBridge | null {
  if (platform === 'garmin') return new GarminBridge();
  if (platform === 'healthkit') return Platform.OS === 'ios' ? new HealthKitBridge() : null;
  if (platform === 'healthconnect') {
    return Platform.OS === 'android' ? new HealthConnectBridge() : null;
  }
  if (Platform.OS === 'ios') return new HealthKitBridge();
  if (Platform.OS === 'android') return new HealthConnectBridge();
  return null;
}

async function getLastSyncMs(platform: HealthPlatform): Promise<number> {
  const raw = await secureStorage.getItem(`${LAST_SYNC_KEY}:${platform}`);
  const ms = raw ? Number(raw) : NaN;
  // First sync reads the last 7 days; after that, incremental from the last success.
  return Number.isFinite(ms) ? ms : Date.now() - 7 * 86400000;
}

async function setLastSyncMs(platform: HealthPlatform, ms: number): Promise<void> {
  await secureStorage.setItem(`${LAST_SYNC_KEY}:${platform}`, String(ms));
}

export interface SyncResult {
  ok: boolean
  metricsPushed: number
  sleepPushed: boolean
  error?: string
}

/** Push whatever the watch produced since the last successful sync. */
export async function syncHealthData(bridge: HealthBridge): Promise<SyncResult> {
  try {
    const available = await bridge.isAvailable();
    if (!available) {
      return { ok: false, metricsPushed: 0, sleepPushed: false, error: 'unavailable' };
    }

    const permitted = await bridge.hasPermissions();
    if (!permitted) return { ok: false, metricsPushed: 0, sleepPushed: false, error: 'no_permissions' };

    const sinceMs = await getLastSyncMs(bridge.platform);
    const now = Date.now();

    const [metrics, sleep] = await Promise.all([
      bridge.readMetricsSince(sinceMs),
      sinceMs < now - 6 * 3600000 ? bridge.readLastNightSleep() : Promise.resolve(null),
    ]);

    let metricsPushed = 0;
    if (metrics.length > 0) {
      // Backend expects single metric per POST /athlete/health/metrics — loop
      for (const m of metrics) {
        await apiClient.post('/athlete/health/metrics', m);
        metricsPushed++;
      }
    }

    let sleepPushed = false;
    if (sleep) {
      await apiClient.post('/athlete/health/sleep', sleep);
      sleepPushed = true;
    }

    await setLastSyncMs(bridge.platform, now);
    return { ok: true, metricsPushed, sleepPushed };
  } catch (error) {
    console.error('Health sync failed:', error);
    return {
      ok: false,
      metricsPushed: 0,
      sleepPushed: false,
      error: error instanceof Error ? error.message : 'sync_failed',
    };
  }
}

export interface WorkoutSyncResult {
  ok: boolean
  imported: number
  skipped: number
  /** Devices the runs came from, e.g. ["Apple Watch de Juan", "Forerunner 265"]. */
  devices: string[]
  /** Same devices, with type/brand/count so Settings can show them truthfully. */
  deviceList: RecordingDevice[]
  error?: string
}

const DEVICES_KEY = 'health:devices';

/**
 * Last devices seen recording runs for this athlete, read back on app start so
 * Settings shows the real watch name before the first sync of the session.
 */
export async function getRecordedDevices(): Promise<RecordingDevice[]> {
  const raw = await secureStorage.getItem(DEVICES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as RecordingDevice[]) : [];
  } catch {
    return [];
  }
}

async function cacheRecordedDevices(devices: RecordingDevice[]): Promise<void> {
  if (devices.length === 0) return;
  await secureStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
}

/** How far back a device sync looks: 30 days covers a month of runs per sync. */
const WORKOUT_SYNC_WINDOW_MS = 30 * 86400000;

/** Device syncs can be large; the API caps 50 sessions per request. */
const MAX_SESSIONS_PER_REQUEST = 50;

/**
 * Pulls runs recorded on the athlete's watch (Apple Watch via HealthKit, any
 * watch writing into Health Connect on Android) and stores them through the Go
 * API. Re-running is safe: the API dedupes on the device's own workout id.
 */
export async function syncRunningWorkouts(
  bridge: HealthBridge,
  sinceMs: number = Date.now() - WORKOUT_SYNC_WINDOW_MS,
): Promise<WorkoutSyncResult> {
  try {
    const available = await bridge.isAvailable();
    if (!available) {
      return { ok: false, imported: 0, skipped: 0, devices: [], deviceList: [], error: 'unavailable' };
    }
    if (!(await bridge.hasPermissions())) {
      return { ok: false, imported: 0, skipped: 0, devices: [], deviceList: [], error: 'no_permissions' };
    }

    const activities = await bridge.readWorkoutsSince(sinceMs);
    if (activities.length === 0) {
      return { ok: true, imported: 0, skipped: 0, devices: [], deviceList: [] };
    }

    let imported = 0;
    let skipped = 0;
    const deviceList = summarizeDevices(activities);
    await cacheRecordedDevices(deviceList);

    for (let i = 0; i < activities.length; i += MAX_SESSIONS_PER_REQUEST) {
      const chunk = activities.slice(i, i + MAX_SESSIONS_PER_REQUEST);
      const { data } = await apiClient.post('/athlete/running/sessions/import', {
        sessions: chunk.map(toImportPayload),
      });
      // Go API returns the object unwrapped: { imported, skipped, sessions }.
      const body = data as
        | { imported?: number; skipped?: number; data?: { imported?: number; skipped?: number } }
        | undefined;
      imported += body?.imported ?? body?.data?.imported ?? 0;
      skipped += body?.skipped ?? body?.data?.skipped ?? 0;
    }

    return { ok: true, imported, skipped, devices: deviceList.map(d => d.name), deviceList };
  } catch (error) {
    console.error('Running workout sync failed:', error);
    return {
      ok: false,
      imported: 0,
      skipped: 0,
      devices: [],
      deviceList: [],
      error: error instanceof Error ? error.message : 'sync_failed',
    };
  }
}

export { toImportPayload };

/** One-shot helper for post-workout and manual "sync now" triggers. */
export async function syncIfPossible(): Promise<SyncResult | null> {
  const bridge = createHealthBridge();
  if (!bridge) return null;
  const result = await syncHealthData(bridge);
  if (result.ok) await registerDeviceIfNeeded(bridge.platform);
  return result;
}

/**
 * Health-metrics sync plus the runs the watch recorded, in one call. Used by
 * Settings "Sincronizar ahora" so the athlete does not have to know that data
 * travels two paths.
 */
export async function syncAllFromDevice(bridge?: HealthBridge): Promise<{
  metrics: SyncResult | null
  workouts: WorkoutSyncResult
}> {
  const target = bridge ?? createHealthBridge();
  if (!target) {
    return {
      metrics: null,
      workouts: { ok: false, imported: 0, skipped: 0, devices: [], deviceList: [], error: 'unavailable' },
    };
  }
  const [metrics, workouts] = await Promise.all([
    syncHealthData(target),
    syncRunningWorkouts(target),
  ]);
  return { metrics, workouts };
}

/**
 * Registers the platform link. It deliberately does NOT invent a device name:
 * the truthful "which watch" comes from each run's own metadata (see
 * device-identity), so a fabricated "Apple Watch" row would be a lie for an
 * athlete who runs with a Garmin paired to an iPhone.
 */
async function registerDeviceIfNeeded(platform: HealthPlatform): Promise<void> {
  try {
    await apiClient.post('/athlete/health/devices', { platform });
  } catch {
    // Device row may already exist — registration is best-effort, sync already succeeded.
  }
}
