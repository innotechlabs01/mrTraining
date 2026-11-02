/**
 * Health data service — platform-aware wrapper for Apple HealthKit / Google HealthConnect.
 * Provides a unified interface for reading daily activity summary (move/exercise/recovery).
 *
 * iOS: @kingstinct/react-native-healthkit
 * Android: react-native-healthconnect
 */

import { Platform } from 'react-native';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ActivityRingsData = {
  /** Move ring progress (0-1) */
  move: number;
  /** Exercise ring progress (0-1) */
  exercise: number;
  /** Recovery ring progress (0-1) */
  recovery: number;
  /** Active calories burned today */
  activeCalories: number;
  /** Exercise minutes today */
  exerciseMinutes: number;
  /** Stand/move minutes today */
  standMinutes: number;
  /** Whether data was fetched from a real source */
  isRealData: boolean;
};

export type HealthPermissionStatus = 'granted' | 'denied' | 'unavailable' | 'unknown';

/* ------------------------------------------------------------------ */
/*  Platform-specific native module references                         */
/*  These are loaded lazily; null when unavailable or on wrong platform */
/* ------------------------------------------------------------------ */

let hk: {
  requestAuthorization: (types: string[]) => Promise<boolean>;
  queryStatistics: (type: string, aggregation: string, start: Date, end: Date) => Promise<unknown>;
} | null = null;

let hc: {
  isAvailable: () => Promise<boolean>;
  requestPermission: (perms: Array<{ accessType: string; recordType: string }>) => Promise<boolean>;
  readRecords: (type: string, opts: unknown) => Promise<Array<{ calories?: { inCalories: number }; startTime: string; endTime: string }>>;
} | null = null;

let loaded = false;

/**
 * Load native modules once. Uses require() so Jest can mock them.
 * Wrapped in try/catch since the packages may not be installed.
 */
function loadNativeModules() {
  if (loaded) return;
  loaded = true;

  if (Platform.OS === 'ios') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      hk = require('@kingstinct/react-native-healthkit');
    } catch {
      /* not available */
    }
  }

  if (Platform.OS === 'android') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      hc = require('react-native-healthconnect');
    } catch {
      /* not available */
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Permission handling                                                */
/* ------------------------------------------------------------------ */

export async function requestHealthPermissions(): Promise<HealthPermissionStatus> {
  loadNativeModules();

  if (hk) {
    try {
      const granted = await hk.requestAuthorization([
        'ActiveEnergyBurned',
        'AppleExerciseTime',
        'AppleStandHour',
      ]);
      return granted ? 'granted' : 'denied';
    } catch {
      return 'unavailable';
    }
  }

  if (hc) {
    try {
      const available = await hc.isAvailable();
      if (!available) return 'unavailable';
      const granted = await hc.requestPermission([
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'ExerciseSession' },
      ]);
      return granted ? 'granted' : 'denied';
    } catch {
      return 'unavailable';
    }
  }

  return 'unavailable';
}

/* ------------------------------------------------------------------ */
/*  Data reading                                                       */
/* ------------------------------------------------------------------ */

/**
 * Fetch today's activity summary from the platform health store.
 * Falls back to zeroes when unavailable.
 */
export async function getTodayActivity(): Promise<ActivityRingsData> {
  loadNativeModules();

  const fallback: ActivityRingsData = {
    move: 0,
    exercise: 0,
    recovery: 0,
    activeCalories: 0,
    exerciseMinutes: 0,
    standMinutes: 0,
    isRealData: false,
  };

  // --- iOS HealthKit ---
  if (hk) {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [calories, exerciseTime] = await Promise.all([
        hk.queryStatistics('ActiveEnergyBurned', 'cumulative', startOfDay, new Date()),
        hk.queryStatistics('AppleExerciseTime', 'cumulative', startOfDay, new Date()),
      ]);

      const activeCalories = (calories as { sumQuantity?: number } | null)?.sumQuantity ?? 0;
      const exerciseMinutes = (exerciseTime as { sumQuantity?: number } | null)?.sumQuantity ?? 0;

      // Apple recommends: Move 500cal, Exercise 30min, Stand 12hr
      return {
        move: Math.min(1, activeCalories / 500),
        exercise: Math.min(1, exerciseMinutes / 30),
        recovery: 0,
        activeCalories,
        exerciseMinutes,
        standMinutes: 0,
        isRealData: true,
      };
    } catch {
      return fallback;
    }
  }

  // --- Android HealthConnect ---
  if (hc) {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const timeRange = {
        operator: 'between',
        startTime: startOfDay.toISOString(),
        endTime: new Date().toISOString(),
      };

      const [caloriesResult, exerciseResult] = await Promise.all([
        hc.readRecords('ActiveCaloriesBurned', { timeRangeFilter: timeRange }),
        hc.readRecords('ExerciseSession', { timeRangeFilter: timeRange }),
      ]);

      const activeCalories = caloriesResult.reduce(
        (sum, r) => sum + (r.calories?.inCalories ?? 0),
        0,
      );
      const exerciseMinutes = exerciseResult.reduce(
        (sum, r) => sum + Math.round((new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000),
        0,
      );

      return {
        move: Math.min(1, activeCalories / 500),
        exercise: Math.min(1, exerciseMinutes / 30),
        recovery: 0,
        activeCalories,
        exerciseMinutes,
        standMinutes: 0,
        isRealData: true,
      };
    } catch {
      return fallback;
    }
  }

  return fallback;
}

/**
 * Check if health platform is available on this device.
 */
export async function isHealthAvailable(): Promise<boolean> {
  loadNativeModules();

  if (hk) return true;

  if (hc) {
    try {
      return await hc.isAvailable();
    } catch {
      return false;
    }
  }

  return false;
}

/** Reset loaded state (for testing only). */
export function _resetForTesting() {
  loaded = false;
  hk = null;
  hc = null;
}
