/**
 * Recovery data hook — real data only.
 *
 * Flow: native bridge -> incremental sync -> API reads. The automatic readiness score is
 * a documented, explainable blend of the athlete's own baselines; when no wearable data
 * exists it falls back to the latest manual self-check-in, never to invented numbers.
 *
 * Data layer: TanStack Query (`recovery-metrics`) with a 60s staleTime, so revisiting
 * the tab reuses the cache and stale reads refetch automatically on focus.
 */
import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

/** API-shaped recovery snapshot — what the query caches and the hook exposes. */
interface RecoveryMetrics {
  readinessScore: number | null
  scoreSource: RecoveryState['scoreSource']
  hrvToday: number | null
  hrvBaseline: number | null
  rhrToday: number | null
  rhrBaseline: number | null
  lastNight: SleepLog | null
  sleepTrend: TrendPoint[]
  lastManualReadiness: number | null
}

const RECOVERY_METRICS_KEY = ['recovery-metrics'] as const;

async function fetchRecoveryMetrics(): Promise<RecoveryMetrics> {
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

  return {
    readinessScore,
    scoreSource,
    hrvToday: hrvToday != null ? round1(hrvToday) : null,
    hrvBaseline: hrvBaseline != null ? round1(hrvBaseline) : null,
    rhrToday: rhrToday != null ? Math.round(rhrToday) : null,
    rhrBaseline: rhrBaseline != null ? Math.round(rhrBaseline) : null,
    lastNight,
    sleepTrend: [...sortedNights].reverse().map(n => ({ date: n.date, value: round1(n.totalMinutes / 60) })),
    lastManualReadiness,
  };
}

export function useRecoveryData(): RecoveryState & {
  grantPermissions: () => Promise<void>
  syncNow: () => Promise<void>
  saveManualReadiness: (score: number) => Promise<boolean>
} {
  const queryClient = useQueryClient();
  const [bridge, setBridge] = useState<{
    readonly platform: HealthPlatform | null
    readonly bridgeAvailable: boolean
    readonly needsPermission: boolean
  }>({ platform: null, bridgeAvailable: false, needsPermission: false });
  const [syncing, setSyncing] = useState(false);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  const metricsQuery = useQuery({
    queryKey: RECOVERY_METRICS_KEY,
    queryFn: fetchRecoveryMetrics,
    staleTime: 60_000,
  });

  // Awaited by every mutation-like action so callers resolve only once the API state
  // is fresh again; resolves void even when the refetch errors (screen reads isError).
  const refreshMetrics = useCallback(
    () => queryClient.invalidateQueries({ queryKey: RECOVERY_METRICS_KEY }).then(() => undefined),
    [queryClient],
  );

  const runSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncIfPossible();
    } finally {
      setSyncing(false);
    }
    await refreshMetrics();
  }, [refreshMetrics]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const nativeBridge = createHealthBridge();
        if (!nativeBridge || !(await nativeBridge.isAvailable())) return;
        const permitted = await nativeBridge.hasPermissions();
        if (active) {
          setBridge({
            bridgeAvailable: true,
            platform: nativeBridge.platform,
            needsPermission: !permitted,
          });
        }
        if (!permitted) return;
        await runSync();
      } catch (e) {
        if (active) {
          setBridgeError(e instanceof Error ? e.message : 'No se pudo cargar la recuperación');
        }
      }
    })();
    return () => { active = false; };
  }, [runSync]);

  const grantPermissions = useCallback(async () => {
    const nativeBridge = createHealthBridge();
    if (!nativeBridge) return;
    setSyncing(true);
    const granted = await nativeBridge.requestPermissions().catch(() => false);
    setBridge(prev => ({ ...prev, needsPermission: !granted }));
    setSyncing(false);
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
      await refreshMetrics();
      return true;
    } catch {
      return false;
    }
  }, [refreshMetrics]);

  const metrics = metricsQuery.data;
  return {
    readinessScore: metrics?.readinessScore ?? null,
    scoreSource: metrics?.scoreSource ?? 'none',
    hrvToday: metrics?.hrvToday ?? null,
    hrvBaseline: metrics?.hrvBaseline ?? null,
    rhrToday: metrics?.rhrToday ?? null,
    rhrBaseline: metrics?.rhrBaseline ?? null,
    lastNight: metrics?.lastNight ?? null,
    sleepTrend: metrics?.sleepTrend ?? [],
    platform: bridge.platform,
    bridgeAvailable: bridge.bridgeAvailable,
    needsPermission: bridge.needsPermission,
    syncing,
    loading: metricsQuery.isLoading,
    error:
      bridgeError ??
      (metricsQuery.isError ? 'No se pudo cargar la recuperación' : null),
    lastManualReadiness: metrics?.lastManualReadiness ?? null,
    grantPermissions,
    syncNow: runSync,
    saveManualReadiness,
  };
}
