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
import type { HealthBridge, HealthMetric, SleepLog } from './types';

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

const iso = (ms: number) => new Date(ms).toISOString();

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
