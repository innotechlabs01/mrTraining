/**
 * Garmin bridge.
 *
 * Unlike HealthKit/Health Connect, Garmin data is pulled by the Go API (Health
 * API + webhook), not read from the device. This bridge therefore reports
 * connection state only: metrics/sleep return empty so the local sync engine
 * never double-writes what the server already imported.
 */
import type { HealthBridge, HealthMetric, SleepLog } from './types';
import { secureStorage } from '../storage/mmkv';

/** Set once the Garmin account is linked (server OAuth callback / manual link). */
export const GARMIN_CONNECTED_KEY = 'health:garminConnected';

export class GarminBridge implements HealthBridge {
  readonly platform = 'garmin' as const;

  async isAvailable(): Promise<boolean> {
    const flag = await secureStorage.getItem(GARMIN_CONNECTED_KEY);
    return flag === '1';
  }

  async requestPermissions(): Promise<boolean> {
    return this.isAvailable();
  }

  async hasPermissions(): Promise<boolean> {
    return this.isAvailable();
  }

  async readMetricsSince(_sinceMs: number): Promise<HealthMetric[]> {
    // Server-side sync owns Garmin metrics.
    return [];
  }

  async readLastNightSleep(): Promise<SleepLog | null> {
    return null;
  }
}

export async function setGarminConnected(connected: boolean): Promise<void> {
  if (connected) {
    await secureStorage.setItem(GARMIN_CONNECTED_KEY, '1');
  } else {
    await secureStorage.removeItem(GARMIN_CONNECTED_KEY);
  }
}
