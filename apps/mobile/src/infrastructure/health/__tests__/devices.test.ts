import { hasWatch, summarizeDevices } from '../devices';
import type { DeviceActivity } from '../types';

function run(overrides: Partial<DeviceActivity>): DeviceActivity {
  return {
    externalId: 'id',
    source: 'apple_watch',
    deviceName: 'Apple Watch de Juan',
    deviceBrand: 'Apple',
    date: '2026-10-18',
    distanceKm: 8,
    durationSec: 2400,
    calories: 400,
    route: [],
    ...overrides,
  };
}

describe('summarizeDevices', () => {
  it('groups runs per recording device and counts them', () => {
    const devices = summarizeDevices([
      run({ externalId: 'a', date: '2026-10-10' }),
      run({ externalId: 'b', date: '2026-10-18' }),
      run({
        externalId: 'c',
        source: 'garmin',
        deviceName: 'Forerunner 265',
        deviceBrand: 'Garmin',
        date: '2026-10-12',
      }),
    ]);

    expect(devices).toEqual([
      {
        source: 'apple_watch',
        name: 'Apple Watch de Juan',
        brand: 'Apple',
        workouts: 2,
        lastAt: '2026-10-18',
      },
      {
        source: 'garmin',
        name: 'Forerunner 265',
        brand: 'Garmin',
        workouts: 1,
        lastAt: '2026-10-12',
      },
    ]);
  });

  it('returns an empty list when the watch recorded nothing', () => {
    expect(summarizeDevices([])).toEqual([]);
  });

  it('does not treat a phone-recorded run as a watch', () => {
    const devices = summarizeDevices([
      run({ source: 'phone', deviceName: 'iPhone de Juan', deviceBrand: 'Apple' }),
    ]);
    expect(hasWatch(devices)).toBe(false);
  });

  it('detects a watch when one of the devices is a watch', () => {
    expect(
      hasWatch(
        summarizeDevices([
          run({ source: 'phone', deviceName: 'iPhone' }),
          run({ source: 'garmin', deviceName: 'Fenix 7', deviceBrand: 'Garmin' }),
        ]),
      ),
    ).toBe(true);
  });
});
