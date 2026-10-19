/**
 * GATT vocabulary and byte parsers for the standard Bluetooth SIG profiles a
 * watch exposes to a third-party app.
 *
 * Bluetooth is the one channel where a watch talks to us directly: a Garmin with
 * "Broadcast Heart Rate" on (and any standard BLE chest strap) advertises the
 * Heart Rate Service and streams measurements while running. Everything in this
 * file is a pure function over bytes, so the parsing is unit-testable without a
 * device: no native calls, no globals.
 */

/** Heart Rate Service (0x180D) — what a broadcasting watch advertises. */
export const HEART_RATE_SERVICE = '0000180D-0000-1000-8000-00805F9B34FB';
/** Heart Rate Measurement (0x2A37) — notifying characteristic with the BPM. */
export const HEART_RATE_MEASUREMENT = '00002A37-0000-1000-8000-00805F9B34FB';
/** Body Sensor Location (0x2A38) — says whether the sensor sits on the wrist. */
export const BODY_SENSOR_LOCATION = '00002A38-0000-1000-8000-00805F9B34FB';

/** Battery Service (0x180F) / Battery Level (0x2A19), one byte of percent. */
export const BATTERY_SERVICE = '0000180F-0000-1000-8000-00805F9B34FB';
export const BATTERY_LEVEL = '00002A19-0000-1000-8000-00805F9B34FB';

/** Device Information Service (0x180A) — how we learn the real watch model. */
export const DEVICE_INFORMATION_SERVICE = '0000180A-0000-1000-8000-00805F9B34FB';
export const MANUFACTURER_NAME = '00002A29-0000-1000-8000-00805F9B34FB';
export const MODEL_NUMBER = '00002A24-0000-1000-8000-00805F9B34FB';

/** Body Sensor Location values (Bluetooth SIG assigned numbers). */
export const BODY_SENSOR_LOCATIONS: Record<number, string> = {
  0: 'other',
  1: 'chest',
  2: 'wrist',
  3: 'finger',
  4: 'hand',
  5: 'ear_lobe',
  6: 'foot',
};

export interface HeartRateMeasurement {
  /** Beats per minute. */
  bpm: number
  /** Only present when the sensor reports contact detection support. */
  contactDetected?: boolean | undefined
  /** RR intervals in milliseconds, when the sensor streams them (HRV). */
  rrIntervalsMs?: number[] | undefined
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Decodes a base64 string into bytes. Implemented here instead of relying on
 * `atob` so the parsers behave identically on Hermes, Node (tests) and web.
 */
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

/** Decodes UTF-8 bytes into a string (GATT string characteristics are UTF-8). */
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
      const code =
        ((byte & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f);
      const point = code - 0x10000;
      out += String.fromCharCode(0xd800 + (point >> 10), 0xdc00 + (point & 0x3ff));
    }
  }
  return out;
}

/**
 * Parses a Heart Rate Measurement (0x2A37) payload.
 *
 * Layout: one flags byte, then the BPM (uint8 or little-endian uint16 depending
 * on flag bit 0), then optional energy expended (uint16, kJ) and RR intervals
 * (uint16 each, in 1/1024 s). The BPM width is re-read from the flags on every
 * notification because a sensor may switch format mid-connection.
 *
 * Returns null when the payload is too short to hold a heart rate.
 */
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
  if (bpm <= 0 || bpm > 250) return null; // physiologically impossible → junk frame

  // Sensor contact is only meaningful when the sensor says it supports it.
  const hasContactSupport = (flags & 0x04) !== 0;
  const contactDetected = hasContactSupport ? (flags & 0x02) !== 0 : undefined;

  if ((flags & 0x08) !== 0) offset += 2; // energy expended (kJ) — not used for HR

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

/** Parses Battery Level (0x2A19): a single byte percentage, 0–100. */
export function parseBatteryLevel(bytes: number[]): number | null {
  const level = bytes[0];
  if (typeof level !== 'number' || level > 100) return null;
  return level;
}
