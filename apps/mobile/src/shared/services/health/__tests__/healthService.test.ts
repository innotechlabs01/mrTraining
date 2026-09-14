import { Platform } from 'react-native';

// Mock platform modules — virtual since native packages may not be installed in test env
jest.mock('@kingstinct/react-native-healthkit', () => ({
  requestAuthorization: jest.fn().mockResolvedValue(true),
  queryStatistics: jest.fn().mockResolvedValue({ sumQuantity: 150 }),
}), { virtual: true });

jest.mock('react-native-healthconnect', () => ({
  isAvailable: jest.fn().mockResolvedValue(false),
  requestPermission: jest.fn().mockResolvedValue(true),
  readRecords: jest.fn().mockResolvedValue([]),
}), { virtual: true });

import { requestHealthPermissions, getTodayActivity, isHealthAvailable, _resetForTesting } from '../healthService';

describe('healthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetForTesting();
    (Platform as { OS: string }).OS = 'ios';
  });

  describe('requestHealthPermissions', () => {
    it('returns granted on iOS when authorized', async () => {
      const status = await requestHealthPermissions();
      expect(status).toBe('granted');
    });

    it('returns unavailable on unsupported platform', async () => {
      (Platform as { OS: string }).OS = 'web';
      const status = await requestHealthPermissions();
      expect(status).toBe('unavailable');
    });
  });

  describe('getTodayActivity', () => {
    it('returns real data from HealthKit', async () => {
      const data = await getTodayActivity();
      expect(data.isRealData).toBe(true);
      expect(data.move).toBeGreaterThanOrEqual(0);
      expect(data.move).toBeLessThanOrEqual(1);
      expect(data.exercise).toBeGreaterThanOrEqual(0);
      expect(data.exercise).toBeLessThanOrEqual(1);
    });

    it('clamps values to 0-1 range', async () => {
      const data = await getTodayActivity();
      expect(data.move).toBeGreaterThanOrEqual(0);
      expect(data.move).toBeLessThanOrEqual(1);
      expect(data.exercise).toBeGreaterThanOrEqual(0);
      expect(data.exercise).toBeLessThanOrEqual(1);
      expect(data.recovery).toBeGreaterThanOrEqual(0);
      expect(data.recovery).toBeLessThanOrEqual(1);
    });

    it('returns fallback on unsupported platform', async () => {
      (Platform as { OS: string }).OS = 'web';
      const data = await getTodayActivity();
      expect(data.isRealData).toBe(false);
      expect(data.move).toBe(0);
    });
  });

  describe('isHealthAvailable', () => {
    it('returns true on iOS', async () => {
      const available = await isHealthAvailable();
      expect(available).toBe(true);
    });

    it('returns false on web', async () => {
      (Platform as { OS: string }).OS = 'web';
      const available = await isHealthAvailable();
      expect(available).toBe(false);
    });
  });
});
