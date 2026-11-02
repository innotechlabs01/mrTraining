import { identifyDevice } from '../device-identity';
import { localDate, routeDistanceKm } from '../geo';

describe('identifyDevice', () => {
  it('detects an Apple Watch from the source name', () => {
    const id = identifyDevice({
      name: 'Apple Watch de Juan',
      bundleIdentifier: 'com.apple.health',
      productType: 'Watch7,1',
      platform: 'healthkit',
    });
    expect(id).toEqual({ source: 'apple_watch', name: 'Apple Watch de Juan', brand: 'Apple' });
  });

  it('detects an Apple Watch from the product type alone', () => {
    const id = identifyDevice({ productType: 'Watch6,2', platform: 'healthkit' });
    expect(id.source).toBe('apple_watch');
    expect(id.brand).toBe('Apple');
  });

  it('detects Garmin even when HealthKit is the delivery channel', () => {
    const id = identifyDevice({
      name: 'Garmin Connect',
      bundleIdentifier: 'com.garmin.connect.mobile',
      platform: 'healthkit',
    });
    expect(id.source).toBe('garmin');
    expect(id.brand).toBe('Garmin');
    expect(id.name).toBe('Garmin Connect');
  });

  it('detects Garmin models on Android via Health Connect device metadata', () => {
    const id = identifyDevice({
      name: 'Forerunner 265',
      bundleIdentifier: 'com.garmin.android.apps.connectmobile',
      manufacturer: 'Garmin',
      model: 'Forerunner 265',
      platform: 'healthconnect',
    });
    expect(id).toEqual({ source: 'garmin', name: 'Forerunner 265', brand: 'Garmin' });
  });

  it('treats an iPhone-recorded run as phone, not as a watch', () => {
    const id = identifyDevice({
      name: 'iPhone de Juan',
      bundleIdentifier: 'com.apple.health',
      platform: 'healthkit',
    });
    expect(id).toEqual({ source: 'phone', name: 'iPhone de Juan', brand: 'Apple' });
  });

  it('falls back to Health Connect on Android when nothing identifies the device', () => {
    const id = identifyDevice({ platform: 'healthconnect' });
    expect(id.source).toBe('health_connect');
  });

  it('falls back to phone on iOS when nothing identifies the device', () => {
    const id = identifyDevice({ platform: 'healthkit' });
    expect(id.source).toBe('phone');
  });
});

describe('geo helpers', () => {
  it('formats the local calendar day', () => {
    expect(localDate(new Date(2026, 9, 18, 23, 30))).toBe('2026-10-18');
  });

  it('sums real splits while ignoring GPS jumps', () => {
    const km = routeDistanceKm([
      { lat: -34.6, lng: -58.38, timestamp: '2026-10-18T10:00:00Z' },
      { lat: -34.609, lng: -58.38, timestamp: '2026-10-18T10:05:00Z' }, // ~1km in 5min = 12km/h
      { lat: -34.618, lng: -58.38, timestamp: '2026-10-18T10:10:00Z' }, // ~1km, plausible
      { lat: -30.0, lng: -58.38, timestamp: '2026-10-18T10:15:00Z' }, // GPS jump, ignored
    ]);
    expect(km).toBeGreaterThan(1.9);
    expect(km).toBeLessThan(2.2);
  });
});
