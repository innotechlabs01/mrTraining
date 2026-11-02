/** Pure Bluetooth GATT parsers - no native dependencies needed for unit testing. */

/** Heart Rate Service (0x180D) */
export const HEART_RATE_SERVICE = '0000180D-0000-1000-8000-00805F9B34FB';
/** Heart Rate Measurement (0x2A37) */
export const HEART_RATE_MEASUREMENT = '00002A37-0000-1000-8000-00805F9B34FB';
/** Battery Service (0x180F) */
export const BATTERY_SERVICE = '0000180F-0000-1000-8000-00805F9B34FB';
/** Battery Level (0x2A19) */
export const BATTERY_LEVEL = '00002A19-0000-1000-8000-00805F9B34FB';
/** Device Information Service (0x180A) */
export const DEVICE_INFORMATION_SERVICE = '0000180A-0000-1000-8000-00805F9B34FB';
/** Manufacturer Name (0x2A29) */
export const MANUFACTURER_NAME = '00002A29-0000-1000-8000-00805F9B34FB';
/** Model Number (0x2A24) */
export const MODEL_NUMBER = '00002A24-0000-1000-8000-00805F9B34FB';

/** Body Sensor Location values */
export const BODY_SENSOR_LOCATIONS: Record<number, string> = {
  0: 'other',
  1: 'chest',
  2: 'wrist',
  3: 'finger',
  4: 'hand',
  5: 'ear_lobe',
  6: 'foot',
};

/** Heart Rate Measurement parsed result */
export interface HeartRateMeasurement {
  bpm: number;
  contactDetected?: boolean | undefined;
  rrIntervalsMs?: number[] | undefined;
}

/** Parse a Heart Rate Measurement (0x2A37) payload from raw bytes. */
export function parseHeartRateMeasurement(bytes: number[]): HeartRateMeasurement | null {
  if (bytes.length < 2) return null;

  const flags = bytes[0] ?? 0;
  const isUint16 = (flags & 0x01) !== 0;
  let offset = 1;

  let bpm: number;
  if (isUint16) {
    if (bytes.length < 3) return null;
    bpm = (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
    offset += 2;
  } else {
    bpm = bytes[offset] ?? 0;
    offset += 1;
  }
  if (bpm <= 0 || bpm > 250) return null; // physiologically impossible

  const hasContactSupport = (flags & 0x04) !== 0;
  const contactDetected = hasContactSupport ? (flags & 0x02) !== 0 : undefined;

  if ((flags & 0x08) !== 0) offset += 2; // energy expended

  let rrIntervalsMs: number[] | undefined;
  if ((flags & 0x10) !== 0) {
    rrIntervalsMs = [];
    while (offset + 2 <= bytes.length) {
      const raw = (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
      rrIntervalsMs.push(Math.round((raw / 1024) * 1000));
      offset += 2;
    }
    if (rrIntervalsMs.length === 0) rrIntervalsMs = undefined;
  }

  return { bpm, contactDetected, rrIntervalsMs };
}

/** Parse Battery Level (0x2A19): a single byte percentage, 0–100. */
export function parseBatteryLevel(bytes: number[]): number | null {
  const level = bytes[0];
  if (typeof level !== 'number' || level > 100) return null;
  return level;
}

/** Device Information parsed strings */
export interface DeviceInfo {
  manufacturer: string | null;
  model: string | null;
}

/** Extract device info from Device Information Service characteristics. */
export function parseDeviceInfo(manufacturerBytes: number[], modelBytes: number[]): DeviceInfo {
  return {
    manufacturer: bytesToUtf8(manufacturerBytes),
    model: bytesToUtf8(modelBytes),
  };
}

/** Base64 decode */
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+';

export function base64ToBytes(value: string): number[] {
  const clean = value.replace(/[^A-Za-z0-9+/=]/g, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const char of clean) {
    if (char === '=') break;
    const index = BASE64_ALPHABET.indexOf(char);
    if (index < 0) continue;
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

export function bytesToUtf8(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i] ?? 0;
    if (byte < 0x80) {
      out += String.fromCharCode(byte);
    } else if (byte >= 0xc0 && byte < 0xe0) {
      const next = bytes[++i] ?? 0;
      out += String.fromCharCode(((byte & 0x1f) << 6) | (next & 0x3f));
    } else if (byte >= 0xe0 && byte < 0xf0) {
      const b2 = bytes[++i] ?? 0;
      const b3 = bytes[++i] ?? 0;
      out += String.fromCharCode(((byte & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f));
    } else {
      const b2 = bytes[++i] ?? 0;
      const b3 = bytes[++i] ?? 0;
      const b4 = bytes[++i] ?? 0;
      const code = ((byte & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f);
      const point = code - 0x10000;
      out += String.fromCharCode(0xd800 + (point >> 10), 0xdc00 + (point & 0x3ff));
    }
  }
  return out;
}

/** Which device is on the other end of the Bluetooth link?
 * Uses the same vocabulary as HealthKit/Health Connect: brand + source.
 * A BLE peripheral tells us: advertised name, and — once connected — the
 * Device Information Service strings (manufacturer name, model number).
 */
export function identifyPeripheralFromBytes(
  name?: string | null,
  manufacturer?: string | null,
  model?: string | null
): { source: string | null; name: string; brand: string } {
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
    { hint: 'hrm', brand: 'Bluetooth' },
  ];

  const clean = (value: string | null | undefined): string => (value ?? '').trim();
  const joined = [name, model, manufacturer].filter(Boolean).join(' | ');

  if (/garmin|forerunner|fenix|venu|vivoactive|instinct|epix/i.test(joined)) {
    return { source: 'garmin', name: model || name || 'Garmin', brand: 'Garmin' };
  }

  if (/apple.*watch|^watch\d|apple inc/i.test(joined)) {
    return { source: 'apple_watch', name: model || name || 'Apple Watch', brand: 'Apple' };
  }

  const strap = STRAP_HINTS.find(s => joined.toLowerCase().includes(s.hint));
  if (strap) {
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