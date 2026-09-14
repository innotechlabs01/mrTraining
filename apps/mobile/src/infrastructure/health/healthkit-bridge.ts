/**
 * HealthKit bridge (iOS) via @kingstinct/react-native-healthkit v14.
 *
 * API notes verified against the installed typings:
 *  - requestAuthorization({ toShare, toRead })
 *  - queryStatisticsForQuantity(id, statistics[], options?)
 *  - queryQuantitySamples/queryCategorySamples(id, { filter: { date }, limit }) — limit required
 *  - Sleep values: CategoryValueSleepAnalysis (asleepCore=3, asleepDeep=4, asleepREM=5, awake=2)
 */
import type { HealthBridge, HealthMetric, SleepLog } from './types';

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
const READ_TYPES = [
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierVO2Max',
  'HKCategoryTypeIdentifierSleepAnalysis',
] as const;

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
