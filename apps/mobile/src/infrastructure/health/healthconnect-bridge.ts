/**
 * Health Connect bridge (Android) via react-native-health-connect v4.
 *
 * API notes verified against the installed typings:
 *  - no isProviderAvailable: initialize() + getSdkStatus()
 *  - hasPermissions via getGrantedPermissions() — readRecord takes an id string, not options
 *  - readRecords(recordType, { timeRangeFilter: { operator: 'between', ... }, pageSize? })
 *  - Instantaneous records carry .time; interval records carry startTime/endTime
 *  - SleepStageType: AWAKE=1, LIGHT=4, DEEP=5, REM=6
 */
import type { DeviceActivity, HealthBridge, HealthMetric, RoutePoint, SleepLog } from './types';
import { identifyDevice } from './device-identity';
import { localDate, round2, routeDistanceKm } from './geo';

type HealthConnectModule = typeof import('react-native-health-connect');

let cachedModule: HealthConnectModule | null = null;

async function hc(): Promise<HealthConnectModule | null> {
  if (cachedModule) return cachedModule;
  try {
    cachedModule = await import('react-native-health-connect');
    return cachedModule;
  } catch {
    return null;
  }
}

const MS_PER_DAY = 86400000;

// ExerciseSession.exerciseType values (Health Connect enums).
const EXERCISE_RUNNING = 56;
const EXERCISE_RUNNING_TREADMILL = 57;

const iso = (ms: number) => new Date(ms).toISOString();

/**
 * Health Connect reports lengths as { value, unit } rather than meters, so a
 * route recorded on a watch configured in miles must still store meters.
 */
function lengthToMeters(length: unknown): number | undefined {
  const l = length as { value?: number; unit?: string } | undefined;
  if (typeof l?.value !== 'number') return undefined;
  switch (l.unit) {
    case 'kilometers':
      return l.value * 1000;
    case 'miles':
      return l.value * 1609.344;
    case 'inches':
      return l.value * 0.0254;
    case 'feet':
      return l.value * 0.3048;
    default:
      return l.value; // 'meters'
  }
}

export class HealthConnectBridge implements HealthBridge {
  readonly platform = 'healthconnect' as const;

  async isAvailable(): Promise<boolean> {
    const m = await hc();
    if (!m) return false;
    try {
      await m.initialize();
      // SdkAvailable === 3 per Health Connect SDK status codes; accept any > 0 that is
      // not UPDATE_REQUIRED(1)/INSTALL_REQUIRED(2).
      const status = await m.getSdkStatus();
      return status >= 3;
    } catch {
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    const m = await hc();
    if (!m) return false;
    try {
      await m.initialize();
      const granted = await m.requestPermission([
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
        { accessType: 'read', recordType: 'RestingHeartRate' },
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'Vo2Max' },
        { accessType: 'read', recordType: 'SleepSession' },
        // Runs recorded by a watch (Garmin syncs into Health Connect on Android).
        { accessType: 'read', recordType: 'ExerciseSession' },
        { accessType: 'read', recordType: 'Distance' },
      ]);
      return granted.length > 0;
    } catch {
      return false;
    }
  }

  async hasPermissions(): Promise<boolean> {
    const m = await hc();
    if (!m) return false;
    try {
      await m.initialize();
      const granted = await m.getGrantedPermissions();
      return granted.length > 0;
    } catch {
      return false;
    }
  }

  private range(sinceMs: number) {
    return {
      timeRangeFilter: {
        operator: 'between' as const,
        startTime: iso(sinceMs),
        endTime: iso(Date.now()),
      },
    };
  }

  async readMetricsSince(sinceMs: number): Promise<HealthMetric[]> {
    const m = await hc();
    if (!m) return [];
    const opts = this.range(sinceMs);
    const metrics: HealthMetric[] = [];

    try {
      const hrv = await m.readRecords('HeartRateVariabilityRmssd', opts);
      for (const r of hrv.records ?? []) {
        if (r.heartRateVariabilityMillis <= 0) continue;
        metrics.push({
          metricType: 'hrv', value: r.heartRateVariabilityMillis, unit: 'ms',
          source: this.platform, recordedAt: r.time,
        });
      }
    } catch { /* none */ }

    try {
      const rhr = await m.readRecords('RestingHeartRate', opts);
      for (const r of rhr.records ?? []) {
        if (r.beatsPerMinute <= 0 || r.beatsPerMinute > 250) continue;
        metrics.push({
          metricType: 'resting_hr', value: r.beatsPerMinute, unit: 'bpm',
          source: this.platform, recordedAt: r.time,
        });
      }
    } catch { /* none */ }

    try {
      const steps = await m.readRecords('Steps', opts);
      const total = (steps.records ?? []).reduce((sum, r) => sum + (r.count ?? 0), 0);
      if (total > 0) {
        metrics.push({ metricType: 'steps', value: total, unit: 'steps', source: this.platform, recordedAt: iso(Date.now()) });
      }
    } catch { /* none */ }

    try {
      const cal = await m.readRecords('ActiveCaloriesBurned', opts);
      const totalKcal = (cal.records ?? []).reduce((sum, r) => sum + (r.energy?.inKilocalories ?? 0), 0);
      if (totalKcal > 0) {
        metrics.push({ metricType: 'active_calories', value: Math.round(totalKcal), unit: 'kcal', source: this.platform, recordedAt: iso(Date.now()) });
      }
    } catch { /* none */ }

    try {
      const vo2 = await m.readRecords('Vo2Max', opts);
      for (const r of vo2.records ?? []) {
        if (r.vo2MillilitersPerMinuteKilogram <= 0) continue;
        metrics.push({
          metricType: 'vo2max', value: r.vo2MillilitersPerMinuteKilogram, unit: 'ml/kg/min',
          source: this.platform, recordedAt: r.time,
        });
      }
    } catch { /* none */ }

    return metrics;
  }

  /**
   * Reads running exercise sessions from Health Connect with their route.
   *
   * This is the Android path for both first-party recording and any watch that
   * writes into Health Connect (Garmin Connect does). The producing device is
   * taken from metadata.device / metadata.dataOrigin, so a Garmin run is stored
   * as Garmin even though Health Connect delivered it.
   */
  async readWorkoutsSince(sinceMs: number): Promise<DeviceActivity[]> {
    const m = await hc();
    if (!m) return [];

    let sessions: readonly Record<string, unknown>[] = [];
    try {
      await m.initialize();
      const result = await m.readRecords('ExerciseSession', {
        ...this.range(sinceMs),
        pageSize: 50,
        ascendingOrder: true,
      });
      sessions = (result.records ?? []) as unknown as readonly Record<string, unknown>[];
    } catch {
      return []; // no permission, or nothing recorded in the window
    }

    const activities: DeviceActivity[] = [];
    for (const s of sessions) {
      const activity = await this.toActivity(m, s);
      if (activity) activities.push(activity);
    }
    return activities;
  }

  private async toActivity(
    m: HealthConnectModule,
    s: Record<string, unknown>,
  ): Promise<DeviceActivity | null> {
    const exerciseType = typeof s.exerciseType === 'number' ? s.exerciseType : 0;
    if (exerciseType !== EXERCISE_RUNNING && exerciseType !== EXERCISE_RUNNING_TREADMILL) return null;

    const startTime = typeof s.startTime === 'string' ? s.startTime : '';
    const endTime = typeof s.endTime === 'string' ? s.endTime : '';
    const metadata = (s.metadata ?? {}) as {
      id?: string;
      dataOrigin?: string;
      device?: { manufacturer?: string; model?: string };
    };
    const externalId = metadata.id ?? '';
    if (!externalId || !startTime || !endTime) return null;

    const start = Date.parse(startTime);
    const end = Date.parse(endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    const durationSec = Math.round((end - start) / 1000);

    const route = await this.readRoute(m, externalId);
    const distanceKm = await this.distanceKm(m, startTime, endTime, route);
    if (distanceKm <= 0) return null; // treadmill runs without distance stay out

    const device = metadata.device;
    const identity = identifyDevice({
      name: device?.model,
      bundleIdentifier: metadata.dataOrigin,
      manufacturer: device?.manufacturer,
      model: device?.model,
      platform: 'healthconnect',
    });

    const heartRate = await this.avgHeartRate(m, startTime, endTime);
    const calories = await this.activeCalories(m, startTime, endTime);

    return {
      externalId,
      source: identity.source,
      deviceName: identity.name,
      deviceBrand: identity.brand,
      date: localDate(new Date(start)),
      distanceKm: round2(distanceKm),
      durationSec,
      calories,
      heartRate: heartRate || undefined,
      route,
    };
  }

  private async readRoute(m: HealthConnectModule, recordId: string): Promise<RoutePoint[]> {
    try {
      const locations = await m.requestExerciseRoute(recordId);
      const points: RoutePoint[] = [];
      for (const loc of locations ?? []) {
        if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') continue;
        points.push({
          lat: loc.latitude,
          lng: loc.longitude,
          alt: lengthToMeters(loc.altitude),
          timestamp: loc.time,
          accuracy: lengthToMeters(loc.horizontalAccuracy),
        });
      }
      return points;
    } catch {
      return []; // route consent denied, or no route stored
    }
  }

  private async distanceKm(
    m: HealthConnectModule,
    startTime: string,
    endTime: string,
    route: RoutePoint[],
  ): Promise<number> {
    try {
      const records = await m.readRecords('Distance', {
        timeRangeFilter: { operator: 'between', startTime, endTime },
      });
      const meters = (records.records ?? []).reduce(
        (sum, r) => sum + (r.distance?.inMeters ?? 0),
        0,
      );
      if (meters > 0) return meters / 1000;
    } catch {
      // fall through to the route-derived distance
    }
    return routeDistanceKm(route);
  }

  private async avgHeartRate(
    m: HealthConnectModule,
    startTime: string,
    endTime: string,
  ): Promise<number> {
    try {
      const records = await m.readRecords('HeartRate', {
        timeRangeFilter: { operator: 'between', startTime, endTime },
      });
      const samples = (records.records ?? []).flatMap(r => r.samples ?? []);
      if (samples.length === 0) return 0;
      const total = samples.reduce((sum, s) => sum + (s.beatsPerMinute ?? 0), 0);
      return Math.round(total / samples.length);
    } catch {
      return 0;
    }
  }

  private async activeCalories(
    m: HealthConnectModule,
    startTime: string,
    endTime: string,
  ): Promise<number> {
    try {
      const records = await m.readRecords('ActiveCaloriesBurned', {
        timeRangeFilter: { operator: 'between', startTime, endTime },
      });
      const total = (records.records ?? []).reduce((sum, r) => sum + (r.energy?.inKilocalories ?? 0), 0);
      return Math.round(total);
    } catch {
      return 0;
    }
  }

  async readLastNightSleep(): Promise<SleepLog | null> {
    const m = await hc();
    if (!m) return null;
    try {
      const result = await m.readRecords('SleepSession', this.range(Date.now() - 2 * MS_PER_DAY));
      const sessions = result.records ?? [];
      if (sessions.length === 0) return null;

      const session = sessions[sessions.length - 1];
      const start = Date.parse(session.startTime);
      const end = Date.parse(session.endTime);
      let totalMinutes = Math.round((end - start) / 60000);
      let deepMin = 0, remMin = 0, lightMin = 0, awakeMin = 0;

      for (const stage of session.stages ?? []) {
        const minutes = Math.max(0, Math.round((Date.parse(stage.endTime) - Date.parse(stage.startTime)) / 60000));
        switch (stage.stage) {
          case 1: awakeMin += minutes; break;   // AWAKE
          case 4: lightMin += minutes; break;   // LIGHT
          case 5: deepMin += minutes; break;    // DEEP
          case 6: remMin += minutes; break;     // REM
          default: lightMin += minutes; break;  // UNKNOWN/SLEEPING/OUT_OF_BED -> light bucket
        }
      }
      if ((session.stages ?? []).length > 0) {
        totalMinutes = deepMin + remMin + lightMin;
      }
      if (totalMinutes < 30) return null;

      return {
        date: new Date(end).toISOString().slice(0, 10),
        totalMinutes,
        deepMinutes: deepMin || undefined,
        remMinutes: remMin || undefined,
        lightMinutes: lightMin || undefined,
        awakeMinutes: awakeMin || undefined,
        efficiency: totalMinutes + awakeMin > 0
          ? Math.round((totalMinutes / (totalMinutes + awakeMin)) * 100)
          : undefined,
        source: this.platform,
        recordedAt: session.endTime,
      };
    } catch {
      return null;
    }
  }
}
