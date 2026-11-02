import {
  base64ToBytes,
  bytesToUtf8,
  parseBatteryLevel,
  parseHeartRateMeasurement,
} from '../gatt';

/** Encodes bytes to base64 the way a BLE characteristic arrives in JS. */
function toBase64(bytes: number[]): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += alphabet[b0 >> 2];
    out += alphabet[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '=' : alphabet[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '=' : alphabet[b2 & 0x3f];
  }
  return out;
}

describe('base64 + utf8 helpers', () => {
  it('round-trips bytes through base64', () => {
    expect(base64ToBytes(toBase64([0x00, 0x7f, 0x80, 0xff]))).toEqual([0x00, 0x7f, 0x80, 0xff]);
  });

  it('decodes the Device Information Service strings', () => {
    const garmin = [0x47, 0x61, 0x72, 0x6d, 0x69, 0x6e]; // "Garmin"
    expect(bytesToUtf8(garmin)).toBe('Garmin');
    expect(bytesToUtf8(base64ToBytes(toBase64(garmin)))).toBe('Garmin');
  });

  it('decodes multi-byte UTF-8 (accents in device names)', () => {
    const bytes = base64ToBytes(toBase64([0x47, 0x61, 0x72, 0x6d, 0xe2, 0x9c, 0x94]));
    expect(bytesToUtf8(bytes)).toBe('Garm✔');
  });
});

describe('parseHeartRateMeasurement', () => {
  it('reads a uint8 heart rate with no flags set', () => {
    // flags 0x00, HR 142
    expect(parseHeartRateMeasurement([0x00, 142])).toEqual({
      bpm: 142,
      contactDetected: undefined,
      rrIntervalsMs: undefined,
    });
  });

  it('reads a uint16 heart rate when the format bit is set', () => {
    // flags 0x01 = uint16, HR 180 (0xB4) little-endian
    expect(parseHeartRateMeasurement([0x01, 0xb4, 0x00])?.bpm).toBe(180);
  });

  it('takes two bytes for a uint16 heart rate, not one', () => {
    // Same flag, one byte short: a uint8 reading would wrongly accept it.
    expect(parseHeartRateMeasurement([0x01, 0xb4])).toBeNull();
  });

  it('reports sensor contact only when the sensor supports it', () => {
    // flags 0x06 = contact supported + contact detected, HR 100
    expect(parseHeartRateMeasurement([0x06, 100])?.contactDetected).toBe(true);
    // flags 0x04 = contact supported but not detected
    expect(parseHeartRateMeasurement([0x04, 100])?.contactDetected).toBe(false);
    // flags 0x00 = no support → no claim either way
    expect(parseHeartRateMeasurement([0x00, 100])?.contactDetected).toBeUndefined();
  });

  it('skips the energy expended field and still reads the RR intervals', () => {
    // flags 0x18 = energy expended + RR present, HR 120, energy 300, RR 1024 (=1000ms)
    const frame = [0x18, 120, 0x2c, 0x01, 0x00, 0x04];
    const hr = parseHeartRateMeasurement(frame);
    expect(hr?.bpm).toBe(120);
    expect(hr?.rrIntervalsMs).toEqual([1000]);
  });

  it('reads several RR intervals', () => {
    // flags 0x10, HR 90, two RR: 1024 (1000ms) and 512 (500ms)
    expect(parseHeartRateMeasurement([0x10, 90, 0x00, 0x04, 0x00, 0x02])?.rrIntervalsMs).toEqual([
      1000, 500,
    ]);
  });

  it('rejects truncated and impossible frames', () => {
    expect(parseHeartRateMeasurement([])).toBeNull();
    expect(parseHeartRateMeasurement([0x00])).toBeNull();
    expect(parseHeartRateMeasurement([0x01, 0x2c])).toBeNull(); // uint16 but only one byte
    expect(parseHeartRateMeasurement([0x00, 0])).toBeNull(); // 0 bpm
    expect(parseHeartRateMeasurement([0x00, 251])).toBeNull(); // above human max
    // The sanity cap applies to the 16-bit frame too, so a mis-parsed frame is
    // discarded instead of being stored as a heart rate.
    expect(parseHeartRateMeasurement([0x01, 0x2c, 0x01])).toBeNull(); // 300 bpm
  });
});

describe('parseBatteryLevel', () => {
  it('reads a percentage', () => {
    expect(parseBatteryLevel([82])).toBe(82);
    expect(parseBatteryLevel([0])).toBe(0);
    expect(parseBatteryLevel([100])).toBe(100);
  });

  it('rejects empty or out-of-range values', () => {
    expect(parseBatteryLevel([])).toBeNull();
    expect(parseBatteryLevel([101])).toBeNull();
  });
});
