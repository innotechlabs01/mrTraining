import { toImportPayload } from '../payload';
import type { DeviceActivity } from '../types';

function activity(overrides: Partial<DeviceActivity> = {}): DeviceActivity {
  return {
    externalId: 'HKExt-9F3C',
    source: 'apple_watch',
    deviceName: 'Apple Watch de Juan',
    deviceBrand: 'Apple',
    date: '2026-10-18',
    distanceKm: 10.42,
    durationSec: 3180,
    calories: 612,
    route: [
      {
        lat: -34.6,
        lng: -58.38,
        alt: 12.5,
        timestamp: '2026-10-18T10:00:00Z',
        accuracy: 5,
      },
    ],
    ...overrides,
  };
}

describe('toImportPayload', () => {
  it('maps the device workout id so a re-sync is idempotent', () => {
    expect(toImportPayload(activity()).external_id).toBe('HKExt-9F3C');
  });

  it('sends the device that recorded the run, not the platform', () => {
    const payload = toImportPayload(activity());
    expect(payload).toMatchObject({
      source: 'apple_watch',
      device_name: 'Apple Watch de Juan',
      device_brand: 'Apple',
    });
  });

  it('keeps a Garmin run as garmin even when HealthKit delivered it', () => {
    const payload = toImportPayload(
      activity({ source: 'garmin', deviceName: 'Forerunner 265', deviceBrand: 'Garmin' }),
    );
    expect(payload.source).toBe('garmin');
    expect(payload.device_name).toBe('Forerunner 265');
  });

  it('uses snake_case fields matching the Go import DTO', () => {
    const payload = toImportPayload(activity());
    expect(Object.keys(payload).sort()).toEqual(
      [
        'cadence',
        'calories',
        'date',
        'device_brand',
        'device_name',
        'distance',
        'duration',
        'elevation',
        'external_id',
        'heart_rate',
        'points',
        'source',
      ].sort(),
    );
  });

  it('fills optional metrics with 0 instead of null', () => {
    const payload = toImportPayload(activity());
    expect(payload.elevation).toBe(0);
    expect(payload.heart_rate).toBe(0);
    expect(payload.cadence).toBe(0);
  });

  it('maps route samples to lat/lng/alt/timestamp/accuracy', () => {
    const payload = toImportPayload(activity());
    expect(payload.points).toEqual([
      { lat: -34.6, lng: -58.38, alt: 12.5, timestamp: '2026-10-18T10:00:00Z', accuracy: 5 },
    ]);
  });

  it('works for a run without a route', () => {
    expect(toImportPayload(activity({ route: [] })).points).toEqual([]);
  });
});
