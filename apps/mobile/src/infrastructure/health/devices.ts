/**
 * Which devices actually fed us runs.
 *
 * Apple Watch and Garmin never stream a workout to a third-party app over
 * Bluetooth — the watch hands the workout to the OS (HealthKit on iPhone,
 * Health Connect on Android) and the OS records the producer. `summarizeDevices`
 * turns that per-run provenance into the list shown in Settings, so "Apple
 * Watch" / "Garmin" are labels the data earned, not guesses.
 */
import type { RecordingSource } from './device-identity';
import type { DeviceActivity } from './types';

export interface RecordingDevice {
  source: RecordingSource;
  name: string;
  brand: string;
  /** How many runs in the inspected window came from this device. */
  workouts: number;
  /** Start date (YYYY-MM-DD) of the most recent run from this device. */
  lastAt: string;
}

/** Groups workouts by recording device, busiest first. */
export function summarizeDevices(activities: DeviceActivity[]): RecordingDevice[] {
  const byKey = new Map<string, RecordingDevice>();

  for (const a of activities) {
    const id: RecordingDevice = byKey.get(`${a.source}|${a.deviceName}`) ?? {
      source: a.source,
      name: a.deviceName,
      brand: a.deviceBrand,
      workouts: 0,
      lastAt: a.date,
    };
    id.workouts += 1;
    if (a.date > id.lastAt) id.lastAt = a.date;
    byKey.set(`${a.source}|${a.deviceName}`, id);
  }

  return [...byKey.values()].sort((a, b) => b.workouts - a.workouts || b.lastAt.localeCompare(a.lastAt));
}

/** True when the list contains a run recorded by a watch (not by the phone). */
export function hasWatch(devices: RecordingDevice[]): boolean {
  return devices.some(d => d.source === 'apple_watch' || d.source === 'garmin' || d.source === 'health_connect');
}
