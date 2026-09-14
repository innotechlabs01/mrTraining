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
import { HealthKitBridge } from './healthkit-bridge';
import { HealthConnectBridge } from './healthconnect-bridge';

const LAST_SYNC_KEY = 'health:lastSyncMs';

export function createHealthBridge(): HealthBridge | null {
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

/** One-shot helper for post-workout and manual "sync now" triggers. */
export async function syncIfPossible(): Promise<SyncResult | null> {
  const bridge = createHealthBridge();
  if (!bridge) return null;
  const result = await syncHealthData(bridge);
  if (result.ok) await registerDeviceIfNeeded(bridge.platform);
  return result;
}

async function registerDeviceIfNeeded(platform: HealthPlatform): Promise<void> {
  try {
    await apiClient.post('/athlete/health/devices', {
      platform,
      deviceName: platform === 'healthkit' ? 'Apple Watch' : 'Wearable',
      deviceBrand: platform === 'healthkit' ? 'Apple' : '',
    });
  } catch {
    // Device row may already exist — registration is best-effort, sync already succeeded.
  }
}
