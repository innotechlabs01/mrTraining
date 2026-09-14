/**
 * Recovery data hook — real data only.
 *
 * Flow: native bridge -> incremental sync -> API reads. The automatic readiness score is
 * a documented, explainable blend of the athlete's own baselines; when no wearable data
 * exists it falls back to the latest manual self-check-in, never to invented numbers.
 */
import { useCallback, useEffect, useState } from 'react';
import { smartClient as apiClient } from '../../../infrastructure/api/client';
import { createHealthBridge, syncIfPossible } from '../../../infrastructure/health';
import type { HealthPlatform, SleepLog } from '../../../infrastructure/health/types';

export interface TrendPoint { date: string; value: number }

export interface RecoveryState {
  /** null until measured; undefined = no data at all (show connect prompt). */
  readinessScore: number | null | undefined
  scoreSource: 'automatic' | 'manual' | 'none'
  hrvToday: number | null
  hrvBaseline: number | null
  rhrToday: number | null
  rhrBaseline: number | null
  lastNight: SleepLog | null
  sleepTrend: TrendPoint[]
  platform: HealthPlatform | null
  bridgeAvailable: boolean
  needsPermission: boolean
  syncing: boolean
  loading: boolean
  error: string | null
  lastManualReadiness: number | null
}

const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const dayKey = (isoTs: string) => isoTs.slice(0, 10);

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Readiness from three component scores, each 0..100:
 *   - HRV: today's value relative to baseline (ratio 1.0 -> 50, 2x -> 100)
 *   - Sleep: device score ?? efficiency ?? duration-based (8h target)
 *   - RHR: each bpm below baseline adds a point above 50 (50 + baseline - today)
 * Blend: 40% HRV, 35% sleep, 25% RHR.
 */
export function computeAutomaticReadiness(input: {
  hrvToday: number; hrvBaseline: number;
  rhrToday: number | null; rhrBaseline: number | null;
  sleepScore0to100: number;
}): number {
  const hrvScore = clamp((input.hrvToday / input.hrvBaseline) * 50);
  const rhrComponent =
    input.rhrToday != null && input.rhrBaseline != null && input.rhrBaseline > 0
      ? clamp(50 + (input.rhrBaseline - input.rhrToday))
      : 50; // no RHR signal -> neutral contribution
  return Math.round(clamp(0.4 * hrvScore + 0.35 * input.sleepScore0to100 + 0.25 * rhrComponent));
}

function sleepQuality0to100(night: SleepLog): number {
  if (night.score != null) return clamp(night.score);
  if (night.efficiency != null) return clamp(night.efficiency);
  return clamp((night.totalMinutes / 480) * 100); // 8h target
}

interface MetricRow { metricType: string; value: number; recordedAt: string }

export function useRecoveryData(): RecoveryState & {
  grantPermissions: () => Promise<void>
  syncNow: () => Promise<void>
  saveManualReadiness: (score: number) => Promise<boolean>
} {
  const [state, setState] = useState<RecoveryState>({
    readinessScore: null,
    scoreSource: 'none',
    hrvToday: null,
    hrvBaseline: null,
    rhrToday: null,
    rhrBaseline: null,
    lastNight: null,
    sleepTrend: [],
    platform: null,
    bridgeAvailable: false,
    needsPermission: false,
    syncing: false,
    loading: true,
    error: null,
    lastManualReadiness: null,
  });

  const loadFromApi = useCallback(async () => {
    const [metricsRes, sleepRes] = await Promise.all([
      apiClient.get('/athlete/health/metrics?days=8'),
      apiClient.get('/athlete/health/sleep?days=8'),
    ]);
    const metrics: MetricRow[] = metricsRes.data.metrics ?? [];
    const sleeps: Array<SleepLog & { date: string }> = sleepRes.data.sleepLogs ?? [];

    const byType = (t: string): MetricRow[] =>
      metrics.filter(m => m.metricType === t).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

    // Today = latest sample; baseline = mean of distinct prior days within the window.
    const baselineOf = (rows: MetricRow[]): number | null => {
      if (rows.length < 2) return null;
      const todayKey = dayKey(rows[0].recordedAt);
      const priorDays = [...new Set(rows.filter(r => dayKey(r.recordedAt) !== todayKey).map(r => dayKey(r.recordedAt)))];
      if (priorDays.length === 0) return null;
      const perDay = priorDays.map(day => {
        const dayRows = rows.filter(r => dayKey(r.recordedAt) === day);
        return average(dayRows.map(r => r.value)) ?? 0;
      });
      return average(perDay);
    };

    const hrvRows = byType('hrv');
    const rhrRows = byType('resting_hr');
    const hrvToday = hrvRows[0]?.value ?? null;
    const rhrToday = rhrRows[0]?.value ?? null;
    const hrvBaseline = baselineOf(hrvRows);
    const rhrBaseline = baselineOf(rhrRows);

    const sortedNights = [...sleeps].sort((a, b) => b.date.localeCompare(a.date));
    const lastNight = sortedNights[0] ?? null;

    const manualRows = byType('manual_readiness');
    const lastManualReadiness = manualRows[0]?.value ?? null;

    let readinessScore: number | null = null;
    let scoreSource: RecoveryState['scoreSource'] = 'none';
    if (hrvToday != null && hrvBaseline != null && lastNight) {
      readinessScore = computeAutomaticReadiness({
        hrvToday,
        hrvBaseline,
        rhrToday,
        rhrBaseline,
        sleepScore0to100: sleepQuality0to100(lastNight),
      });
      scoreSource = 'automatic';
    } else if (lastManualReadiness != null) {
      readinessScore = lastManualReadiness <= 10 ? lastManualReadiness * 10 : lastManualReadiness;
      scoreSource = 'manual';
    }

    setState(prev => ({
      ...prev,
      readinessScore,
      scoreSource,
      hrvToday: hrvToday != null ? round1(hrvToday) : null,
      hrvBaseline: hrvBaseline != null ? round1(hrvBaseline) : null,
      rhrToday: rhrToday != null ? Math.round(rhrToday) : null,
      rhrBaseline: rhrBaseline != null ? Math.round(rhrBaseline) : null,
      lastNight,
      sleepTrend: [...sortedNights].reverse().map(n => ({ date: n.date, value: round1(n.totalMinutes / 60) })),
      lastManualReadiness,
      loading: false,
      error: null,
    }));
  }, []);

  const runSync = useCallback(async () => {
    setState(prev => ({ ...prev, syncing: true }));
    try {
      await syncIfPossible();
    } finally {
      setState(prev => ({ ...prev, syncing: false }));
    }
    await loadFromApi();
  }, [loadFromApi]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const bridge = createHealthBridge();
        if (!bridge || !(await bridge.isAvailable())) {
          if (active) setState(prev => ({ ...prev, bridgeAvailable: false, loading: false }));
          await loadFromApi();
          return;
        }
        const permitted = await bridge.hasPermissions();
        if (active) {
          setState(prev => ({
            ...prev,
            bridgeAvailable: true,
            platform: bridge.platform,
            needsPermission: !permitted,
          }));
        }
        if (!permitted) {
          await loadFromApi();
          return;
        }
        await runSync();
      } catch (e) {
        if (active) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: e instanceof Error ? e.message : 'No se pudo cargar la recuperación',
          }));
        }
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grantPermissions = useCallback(async () => {
    const bridge = createHealthBridge();
    if (!bridge) return;
    setState(prev => ({ ...prev, syncing: true }));
    const granted = await bridge.requestPermissions().catch(() => false);
    setState(prev => ({
      ...prev,
      needsPermission: !granted,
      syncing: false,
    }));
    if (granted) await runSync();
  }, [runSync]);

  const saveManualReadiness = useCallback(async (score: number): Promise<boolean> => {
    try {
      const clamped = clamp(score, 0, 100);
      await apiClient.post('/athlete/health/metrics', {
        metricType: 'manual_readiness',
        value: clamped,
        unit: 'score',
        source: 'manual',
        recordedAt: new Date().toISOString(),
      });
      await loadFromApi();
      return true;
    } catch {
      return false;
    }
  }, [loadFromApi]);

  return {
    ...state,
    grantPermissions,
    syncNow: runSync,
    saveManualReadiness,
  };
}
