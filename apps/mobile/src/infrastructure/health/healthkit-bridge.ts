/**
 * HealthKit bridge (iOS) via @kingstinct/react-native-healthkit v14.
 *
 * API notes verified against the installed typings:
 *  - requestAuthorization({ toShare, toRead })
 *  - queryStatisticsForQuantity(id, statistics[], options?)
 *  - queryQuantitySamples/queryCategorySamples(id, { filter: { date }, limit }) — limit required
 *  - Sleep values: CategoryValueSleepAnalysis (asleepCore=3, asleepDeep=4, asleepREM=5, awake=2)
 */
import type { DeviceActivity, HealthBridge, HealthMetric, RoutePoint, SleepLog } from './types';
import { identifyDevice } from './device-identity';
import { localDate, round2, routeDistanceKm } from './geo';

type HealthkitModule = typeof import('@kingstinct/react-native-healthkit');

let cachedModule: HealthkitModule | null = null;

async function hk(): Promise<HealthkitModule | null> {
  if (cachedModule) return cachedModule;
  try {
    cachedModule = await import('@kingstinct/react-native-healthkit');
    return cachedModule;
  } catch {
    return null;
  }
}

const MS_PER_DAY = 86400000;

/** Reads `quantity` out of a HealthKit Quantity, ignoring absent/NaN values. */
function quantityOf(q: unknown): number | null {
  const quantity = (q as { quantity?: number } | undefined)?.quantity;
  return typeof quantity === 'number' && Number.isFinite(quantity) ? quantity : null;
}

const READ_TYPES = [
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierVO2Max',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKQuantityTypeIdentifierHeartRate',
  // Workouts + their route: this is how an Apple Watch run reaches the app.
  'HKWorkoutTypeIdentifier',
  'HKWorkoutRouteTypeIdentifier',
] as const;

/** HKWorkoutActivityType.running — kept as a literal so the bridge works even
 * when the native enum is not exported at runtime. */
const RUNNING_ACTIVITY_TYPE = 37;

const METERS_PER_KM = 1000;

export class HealthKitBridge implements HealthBridge {
  readonly platform = 'healthkit' as const;

  async isAvailable(): Promise<boolean> {
    const m = await hk();
    if (!m) return false;
    try {
      return await m.isHealthDataAvailableAsync();
    } catch {
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    const m = await hk();
    if (!m) return false;
    try {
      return await m.requestAuthorization({ toShare: [], toRead: [...READ_TYPES] });
    } catch {
      return false;
    }
  }

  async hasPermissions(): Promise<boolean> {
    const m = await hk();
    if (!m) return false;
    try {
      // sharingAuthorized === 2; anything else means we must ask first.
      return (await m.authorizationStatusFor('HKQuantityTypeIdentifierRestingHeartRate')) === 2;
    } catch {
      return false;
    }
  }

  async readMetricsSince(sinceMs: number): Promise<HealthMetric[]> {
    const m = await hk();
    if (!m) return [];
    const from = new Date(sinceMs);
    const now = new Date();
    const metrics: HealthMetric[] = [];

    // HRV (SDNN ms): average across the window is what recovery scoring reads.
    try {
      const stats = await m.queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
        ['discreteAverage'],
        { filter: { date: { startDate: from, endDate: now } } },
      );
      const avg = stats?.averageQuantity?.quantity;
      if (typeof avg === 'number' && avg > 0) {
        metrics.push({ metricType: 'hrv', value: avg, unit: 'ms', source: this.platform, recordedAt: now.toISOString() });
      }
    } catch { /* no HRV data for window */ }

    try {
      const rhr = await m.queryQuantitySamples('HKQuantityTypeIdentifierRestingHeartRate', {
        filter: { date: { startDate: from, endDate: now } },
        limit: 60,
      });
      for (const s of rhr) {
        if (s.quantity <= 0 || s.quantity > 250) continue;
        metrics.push({ metricType: 'resting_hr', value: s.quantity, unit: 'bpm', source: this.platform, recordedAt: s.endDate.toISOString() });
      }
    } catch { /* none */ }

    try {
      const steps = await m.queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierStepCount',
        ['cumulativeSum'],
        { filter: { date: { startDate: from, endDate: now } } },
      );
      const sum = steps?.sumQuantity?.quantity;
      if (typeof sum === 'number' && sum > 0) {
        metrics.push({ metricType: 'steps', value: sum, unit: 'steps', source: this.platform, recordedAt: now.toISOString() });
      }
    } catch { /* none */ }

    try {
      const cal = await m.queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        ['cumulativeSum'],
        { filter: { date: { startDate: from, endDate: now } } },
      );
      const sum = cal?.sumQuantity?.quantity;
      if (typeof sum === 'number' && sum > 0) {
        metrics.push({ metricType: 'active_calories', value: Math.round(sum), unit: 'kcal', source: this.platform, recordedAt: now.toISOString() });
      }
    } catch { /* none */ }

    try {
      const vo2 = await m.queryQuantitySamples('HKQuantityTypeIdentifierVO2Max', {
        filter: { date: { startDate: from, endDate: now } },
        limit: 10,
      });
      for (const s of vo2) {
        if (s.quantity <= 0) continue;
        metrics.push({ metricType: 'vo2max', value: s.quantity, unit: 'ml/kg/min', source: this.platform, recordedAt: s.endDate.toISOString() });
      }
    } catch { /* none */ }

    return metrics;
  }

  /**
   * Reads running workouts recorded on the Apple Watch (or any device that
   * writes into HealthKit) together with their GPS route.
   *
   * Distance/energy come from the workout totals; heart rate and cadence from
   * the per-workout statistics when available. The recording device is taken
   * from sourceRevision/device so a Garmin writing into Apple Health is still
   * labelled Garmin instead of Apple.
   */
  async readWorkoutsSince(sinceMs: number): Promise<DeviceActivity[]> {
    const m = await hk();
    if (!m) return [];

    const from = new Date(sinceMs);
    const now = new Date();
    let workouts: readonly { [key: string]: unknown }[] = [];
    try {
      workouts = (await m.queryWorkoutSamples({
        filter: {
          date: { startDate: from, endDate: now },
          workoutActivityType: RUNNING_ACTIVITY_TYPE as never,
        },
        limit: 50,
        ascending: true,
      })) as unknown as readonly { [key: string]: unknown }[];
    } catch {
      return []; // no workout permission, or nothing recorded in the window
    }

    const activities: DeviceActivity[] = [];
    for (const w of workouts) {
      const activity = await this.toActivity(m, w);
      if (activity) activities.push(activity);
    }
    return activities;
  }

  private async toActivity(
    m: HealthkitModule,
    w: { [key: string]: unknown },
  ): Promise<DeviceActivity | null> {
    const uuid = typeof w.uuid === 'string' ? w.uuid : '';
    const start = w.startDate instanceof Date ? w.startDate : null;
    const end = w.endDate instanceof Date ? w.endDate : null;
    if (!uuid || !start || !end) return null;

    const durationSec = Math.round((end.getTime() - start.getTime()) / 1000);
    if (durationSec <= 0) return null;

    const durationQuantity = w.duration as { quantity?: number } | undefined;
    const seconds = typeof durationQuantity?.quantity === 'number' && durationQuantity.quantity > 0
      ? Math.round(durationQuantity.quantity)
      : durationSec;

    const route = await this.readRoute(w);
    const distanceMeters = quantityOf(w.totalDistance);
    const distanceKm = distanceMeters && distanceMeters > 0
      ? distanceMeters / METERS_PER_KM
      : routeDistanceKm(route);
    if (distanceKm <= 0) return null; // treadmill runs without distance stay out

    const sourceRevision = w.sourceRevision as {
      source?: { name?: string; bundleIdentifier?: string };
      productType?: string;
    } | undefined;
    const device = w.device as { name?: string; manufacturer?: string; model?: string } | undefined;

    const identity = identifyDevice({
      name: sourceRevision?.source?.name ?? device?.name,
      bundleIdentifier: sourceRevision?.source?.bundleIdentifier,
      productType: sourceRevision?.productType,
      manufacturer: device?.manufacturer,
      model: device?.model,
      platform: 'healthkit',
    });

    const heartRate = await this.avgHeartRate(m, start, end);

    return {
      externalId: uuid,
      source: identity.source,
      deviceName: identity.name,
      deviceBrand: identity.brand,
      date: localDate(start),
      distanceKm: round2(distanceKm),
      durationSec: seconds,
      calories: Math.round(quantityOf(w.totalEnergyBurned) ?? 0),
      heartRate: heartRate || undefined,
      route,
    };
  }

  private async readRoute(w: { [key: string]: unknown }): Promise<RoutePoint[]> {
    const getRoutes = (w as { getWorkoutRoutes?: () => Promise<readonly { locations?: readonly unknown[] }[]> })
      .getWorkoutRoutes;
    if (typeof getRoutes !== 'function') return [];
    try {
      const chunks = await getRoutes.call(w);
      const points: RoutePoint[] = [];
      for (const chunk of chunks ?? []) {
        for (const raw of chunk.locations ?? []) {
          const loc = raw as {
            latitude?: number;
            longitude?: number;
            altitude?: number;
            date?: Date;
            horizontalAccuracy?: number;
          };
          if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') continue;
          points.push({
            lat: loc.latitude,
            lng: loc.longitude,
            alt: loc.altitude,
            timestamp: (loc.date instanceof Date ? loc.date : new Date()).toISOString(),
            accuracy: loc.horizontalAccuracy,
          });
        }
      }
      return points;
    } catch {
      return [];
    }
  }

  private async avgHeartRate(m: HealthkitModule, start: Date, end: Date): Promise<number> {
    try {
      const stats = await m.queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierHeartRate',
        ['discreteAverage'],
        { filter: { date: { startDate: start, endDate: end } } },
      );
      const avg = stats?.averageQuantity?.quantity;
      return typeof avg === 'number' ? Math.round(avg) : 0;
    } catch {
      return 0;
    }
  }

  async readLastNightSleep(): Promise<SleepLog | null> {
    const m = await hk();
    if (!m) return null;
    try {
      const samples = await m.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
        filter: { date: { startDate: new Date(Date.now() - 2 * MS_PER_DAY), endDate: new Date() } },
        limit: 200,
      });
      const stages = samples ?? [];
      if (stages.length === 0) return null;

      // Enum values per HKCategoryValueSleepAnalysis: core=3, deep=4, rem=5, awake=2.
      let deepMin = 0, remMin = 0, coreMin = 0, awakeMin = 0;
      for (const s of stages) {
        const minutes = Math.max(0, Math.round((s.endDate.getTime() - s.startDate.getTime()) / 60000));
        switch (s.value) {
          case 4: deepMin += minutes; break;
          case 5: remMin += minutes; break;
          case 2: awakeMin += minutes; break;
          case 3: default: coreMin += minutes; break;
        }
      }

      const totalMinutes = deepMin + remMin + coreMin;
      if (totalMinutes < 30) return null; // a nap or stray samples is not "last night"

      const referenceNight = stages[stages.length - 1].endDate.toISOString().slice(0, 10);
      return {
        date: referenceNight,
        totalMinutes,
        deepMinutes: deepMin || undefined,
        remMinutes: remMin || undefined,
        lightMinutes: coreMin || undefined,
        awakeMinutes: awakeMin || undefined,
        efficiency: totalMinutes + awakeMin > 0
          ? Math.round((totalMinutes / (totalMinutes + awakeMin)) * 100)
          : undefined,
        source: this.platform,
        recordedAt: stages[stages.length - 1].endDate.toISOString(),
      };
    } catch {
      return null;
    }
  }
}
