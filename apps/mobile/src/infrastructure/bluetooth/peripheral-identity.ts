/**
 * Which device is on the other end of the Bluetooth link?
 *
 * A BLE peripheral tells us three things we can trust: the advertised name, and
 * — once connected — the Device Information Service strings (manufacturer name,
 * model number). Those are the device's own words, so they are what we map into
 * the same vocabulary the HealthKit/Health Connect path uses: brand plus
 * recording source. Nothing here guesses a model the device did not state.
 */
import type { RecordingSource } from '../health/device-identity';
import { looksLikeGarmin } from '../health/device-identity';

export interface PeripheralInfo {
  /** Advertised name / localName, e.g. "Forerunner 265", "HRM-Dual:1234". */
  name?: string | null | undefined
  /** Device Information Service 0x2A29 manufacturer name string. */
  manufacturer?: string | null | undefined
  /** Device Information Service 0x2A24 model number string. */
  model?: string | null | undefined
}

export interface PeripheralIdentity {
  /**
   * Canonical source when the peripheral is a device that can own a run
   * (a watch); null for a chest strap or anything unidentified, because then it
   * only contributed heart rate, not the recording.
   */
  source: RecordingSource | null
  /** Human-readable device, shown in Settings. */
  name: string
  brand: string
}

/** Generic BLE heart-rate straps: they stream pulse but never record a run. */
const STRAP_HINTS: Array<{ hint: string; brand: string }> = [
  { hint: 'polar', brand: 'Polar' },
  { hint: 'h10', brand: 'Polar' },
  { hint: 'hrm-dual', brand: 'Garmin' },
  { hint: 'hrm-pro', brand: 'Garmin' },
  { hint: 'tickr', brand: 'Wahoo' },
  { hint: 'wahoo', brand: 'Wahoo' },
  { hint: 'coospo', brand: 'CooSpo' },
  { hint: 'magene', brand: 'Magene' },
  { hint: 'decathlon', brand: 'Decathlon' },
  { hint: 'hrm', brand: 'Bluetooth' }, // generic "HRM" strap
];

const clean = (value: string | null | undefined): string => (value ?? '').trim();

/**
 * Resolves brand and source from what the peripheral reports.
 *
 * Order matters: Garmin is checked first because a Garmin watch paired to an
 * iPhone also matches Apple patterns in the OS metadata, and a Garmin strap
 * ("HRM-Dual") must stay Garmin instead of being read as a generic strap.
 */
export function identifyPeripheral(info: PeripheralInfo): PeripheralIdentity {
  const name = clean(info.name);
  const model = clean(info.model);
  const manufacturer = clean(info.manufacturer);
  const joined = [name, model, manufacturer].filter(Boolean).join(' | ');

  if (looksLikeGarmin(joined)) {
    return { source: 'garmin', name: model || name || 'Garmin', brand: 'Garmin' };
  }

  if (/apple\s*watch|^watch\d|apple inc/i.test(joined)) {
    return { source: 'apple_watch', name: model || name || 'Apple Watch', brand: 'Apple' };
  }

  const strap = STRAP_HINTS.find(s => joined.toLowerCase().includes(s.hint));
  if (strap) {
    // A Garmin strap is still Garmin hardware; the hint carries the brand.
    return {
      source: null,
      name: model || name || strap.brand,
      brand: manufacturer || strap.brand,
    };
  }

  return {
    source: null,
    name: model || name || 'Dispositivo Bluetooth',
    brand: manufacturer || 'Bluetooth',
  };
}
