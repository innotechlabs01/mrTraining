/**
 * Device identity — decide *which* watch recorded a workout.
 *
 * Neither Apple Watch nor Garmin streams workouts to third-party apps over
 * Bluetooth: the watch writes to HealthKit (Apple) or Health Connect / Garmin
 * Connect (Android), and the OS records who produced the sample. That
 * provenance — `sourceRevision.source` / `device` on HealthKit,
 * `metadata.device` + `metadata.dataOrigin` on Health Connect — is the truthful
 * answer to "which device is this?", so it is what we store on the session.
 *
 * Everything here is a pure function of the raw metadata: no native calls, so
 * the mapping is unit-testable and identical on both platforms.
 */

/** Canonical sources accepted by the Go API (domain/running.IsDeviceSource). */
export type RecordingSource = 'apple_watch' | 'garmin' | 'health_connect' | 'phone';

export interface RawDeviceInfo {
  /** What the platform reports: "Apple Watch de Juan", "Forerunner 265", "Garmin Connect". */
  name?: string | undefined;
  /** HealthKit: sourceRevision.source.bundleIdentifier. Health Connect: metadata.dataOrigin. */
  bundleIdentifier?: string | undefined;
  /** HealthKit: sourceRevision.productType, e.g. "Watch7,1". */
  productType?: string | undefined;
  /** Health Connect: metadata.device.manufacturer. */
  manufacturer?: string | undefined;
  /** Health Connect: metadata.device.model, e.g. "Pixel Watch 2". */
  model?: string | undefined;
  /** Where the record was read from; decides the fallback when nothing matches. */
  platform: 'healthkit' | 'healthconnect';
}

export interface DeviceIdentity {
  source: RecordingSource;
  /** Human-readable device, shown in Settings and on the run detail. */
  name: string;
  brand: string;
}

const has = (haystack: string | undefined, needle: string): boolean =>
  typeof haystack === 'string' && haystack.toLowerCase().includes(needle);

/**
 * Garmin hints shared by every channel that identifies a device: the OS
 * metadata (HealthKit/Health Connect) and the BLE advertising name. Keeping
 * them in one place means a new model is recognised everywhere at once.
 */
export const GARMIN_HINTS = ['garmin', 'forerunner', 'fenix', 'venu', 'vivoactive', 'instinct', 'epix'];

/** True when the given text (name, model, bundle id…) points at a Garmin device. */
export function looksLikeGarmin(text: string | undefined): boolean {
  return GARMIN_HINTS.some(hint => has(text, hint));
}

/**
 * Resolves the recording device from platform metadata.
 *
 * Order matters: a Garmin watch paired to an iPhone shows up in HealthKit with
 * "Garmin" in the source name, so Garmin is checked before the Apple patterns.
 */
export function identifyDevice(raw: RawDeviceInfo): DeviceIdentity {
  const parts = [raw.name, raw.model, raw.bundleIdentifier, raw.productType, raw.manufacturer];
  const joined = parts.filter(Boolean).join(' | ');

  if (looksLikeGarmin(joined)) {
    return {
      source: 'garmin',
      name: pickName(raw, 'Garmin'),
      brand: 'Garmin',
    };
  }

  // A watch product type always starts with "Watch" (Watch7,1 / Watch6,2).
  const isWatchProductType = typeof raw.productType === 'string' && /^watch/i.test(raw.productType);
  const looksLikeWatch = isWatchProductType || has(joined, 'apple watch') || has(raw.model ?? '', 'watch');

  if (looksLikeWatch) {
    return {
      source: 'apple_watch',
      name: pickName(raw, 'Apple Watch'),
      brand: 'Apple',
    };
  }

  // A run recorded by the phone itself (iPhone + Apple Health, or an Android
  // phone writing into Health Connect).
  if (has(joined, 'iphone') || has(raw.bundleIdentifier ?? '', 'com.apple.health') || has(joined, 'apple')) {
    return { source: 'phone', name: pickName(raw, 'iPhone'), brand: 'Apple' };
  }

  if (/pixel|samsung|xiaomi|oneplus|huawei|android/i.test(joined)) {
    return {
      source: 'health_connect',
      name: pickName(raw, raw.platform === 'healthconnect' ? 'Android' : 'Wearable'),
      brand: raw.manufacturer ?? 'Android',
    };
  }

  // Nothing identifiable: on Android the data reached us through Health Connect,
  // on iOS through HealthKit backed by the phone.
  return raw.platform === 'healthconnect'
    ? { source: 'health_connect', name: 'Android', brand: 'Android' }
    : { source: 'phone', name: 'iPhone', brand: 'Apple' };
}

/**
 * Prefers the concrete device model over the app that relayed it: HealthKit
 * often reports "Garmin Connect" as the source name, which says nothing about
 * which watch was on the wrist.
 */
function pickName(raw: RawDeviceInfo, fallback: string): string {
  for (const candidate of [raw.model, raw.name]) {
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate.trim();
    }
  }
  return fallback;
}
