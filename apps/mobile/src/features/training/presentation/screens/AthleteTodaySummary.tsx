/**
 * Athlete Today Summary — readiness hero for the athlete's landing screen.
 *
 * Shows real data from wearable + training history:
 *   - Real readiness (from health metrics, not mock)
 *   - PRs from their training history
 *   - Recommendation based on fatigue + recovery
 *   - Activity rings + streak pill
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, radius, typography } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { Badge } from '../../../../shared/components/ui/Badge';
import { InfoIcon } from '../../../../shared/components/icons';
import { ActivityRings } from '../../../../shared/components/fitness/ActivityRings';
import { StreakBadge } from '../../../../shared/components/gamification/StreakBadge';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.athleteTodaySummary;

type HealthMetric = { metricType: string; value: number; unit: string; source: string; recordedAt: string };
type SleepLog = { date: string; totalMinutes: number; deepMinutes?: number; remMinutes?: number };
type HealthData = {
  hrv: HealthMetric[];
  restingHr: HealthMetric[];
  sleepLogs: SleepLog[];
  manualReadiness: HealthMetric[];
};

type Props = {
  athleteId: string;
  /** Activity rings: move / exercise / recovery, each 0-1. */
  move: number;
  exercise: number;
  recovery: number;
  streak?: number;
  streakInactive?: boolean;
};

function latestVsBaseline(rows: HealthMetric[]): { latest: number; deltaPct: number | null } | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const latest = sorted[0].value;
  const todayKey = sorted[0].recordedAt.slice(0, 10);
  const priorDays = [...new Set(sorted.filter(r => r.recordedAt.slice(0, 10) !== todayKey).map(r => r.recordedAt.slice(0, 10)))];
  if (priorDays.length === 0) return { latest, deltaPct: null };
  const byDay = new Map<string, number[]>();
  for (const r of sorted) {
    const key = r.recordedAt.slice(0, 10);
    if (key === todayKey) continue;
    byDay.set(key, [...(byDay.get(key) ?? []), r.value]);
  }
  const dayAvgs = [...byDay.values()].map(vs => vs.reduce((a, b) => a + b, 0) / vs.length);
  const baseline = dayAvgs.reduce((a, b) => a + b, 0) / dayAvgs.length;
  return { latest, deltaPct: baseline > 0 ? Math.round(((latest - baseline) / baseline) * 100) : null };
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null) return null;
  const color = delta >= 0 ? colors.success : colors.error;
  return (
    <Text style={[styles.delta, { color }]}>
      {delta >= 0 ? '+' : ''}{delta}%
    </Text>
  );
}

/**
 * Readiness hero for Today. Fetches real health + training data and renders
 * a scoreboard: big numeral, activity rings, mini trends, coach recommendation.
 */
export function AthleteTodaySummary({ athleteId, move, exercise, recovery, streak, streakInactive = false }: Props) {
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClient.get('/athlete/health/metrics?days=8').then(r => r.data).catch(() => null),
      apiClient.get('/athlete/health/sleep?days=8').then(r => r.data).catch(() => null),
    ]).then(([metricsRes, sleepRes]) => {
      if (cancelled) return;
      const allMetrics: HealthMetric[] = metricsRes?.metrics ?? [];
      setHealth({
        hrv: allMetrics.filter(m => m.metricType === 'hrv'),
        restingHr: allMetrics.filter(m => m.metricType === 'resting_hr'),
        sleepLogs: sleepRes?.sleepLogs ?? [],
        manualReadiness: allMetrics.filter(m => m.metricType === 'manual_readiness'),
      });
    });
    return () => { cancelled = true; };
  }, [athleteId]);

  // Fallback skeleton while health data loads — the hero must never disappear.
  if (!health) {
    return (
      <Card style={styles.container}>
        <View style={styles.topRow}>
          <Text style={styles.overline}>{t.overline}</Text>
          {typeof streak === 'number' && <StreakBadge count={streak} inactive={streakInactive} />}
        </View>
        <View style={styles.heroRow}>
          <View style={styles.scoreCol}>
            <View style={styles.scoreRow}>
              <Text style={styles.score}>—</Text>
              <Text style={styles.scoreUnit}>/100</Text>
              <Badge text={t.loadingBadge} tone="neutral" />
            </View>
            <Text style={styles.scoreHint}>{t.scoreHint}</Text>
          </View>
          <ActivityRings move={move} exercise={exercise} recovery={recovery} size={120} />
        </View>
      </Card>
    );
  }

  const hrvStat = latestVsBaseline(health.hrv);
  const rhrStat = latestVsBaseline(health.restingHr);
  const lastNight = [...health.sleepLogs].sort((a, b) => b.date.localeCompare(a.date))[0];
  const sleepHrs = lastNight ? (lastNight.totalMinutes / 60).toFixed(1) : null;

  // Compute readiness from real data (sleep + HRV baseline)
  let readinessScore: number | null = null;
  if (hrvStat && lastNight) {
    const sleepScore = Math.min(100, (lastNight.totalMinutes / 480) * 100);
    // Baseline 50 + 2.5pts per HRV % vs 7-day baseline, clamped 0-100.
    const hrvScore = Math.min(100, Math.max(0, 50 + (hrvStat.deltaPct ?? 0) * 2.5));
    readinessScore = Math.round(0.55 * sleepScore + 0.45 * hrvScore);
  }

  // Recommendation
  let recommendation = '';
  if (readinessScore != null && readinessScore >= 80) {
    recommendation = t.recHigh;
  } else if (readinessScore != null && readinessScore >= 60) {
    recommendation = t.recModerate;
  } else if (readinessScore != null) {
    recommendation = t.recRest;
  } else if (hrvStat && hrvStat.deltaPct != null && hrvStat.deltaPct < -10) {
    recommendation = t.recLowHrv;
  } else if (lastNight && lastNight.totalMinutes < 420) {
    recommendation = t.recLowSleep;
  }

  const readinessTone = readinessScore == null ? 'neutral' as const
    : readinessScore >= 80 ? 'success' as const
    : readinessScore >= 60 ? 'warning' as const
    : 'error' as const;
  const readinessLabel = readinessScore == null ? '—'
    : readinessScore >= 80 ? t.badgeReady
    : readinessScore >= 60 ? t.badgeModerate
    : t.badgeRest;

  return (
    <Card style={styles.container}>
      {/* Top row: overline + streak */}
      <View style={styles.topRow}>
        <Text style={styles.overline}>{t.overline}</Text>
        {typeof streak === 'number' && <StreakBadge count={streak} inactive={streakInactive} />}
      </View>

      {/* Scoreboard: big numeral + rings */}
      <View style={styles.heroRow}>
        <View style={styles.scoreCol}>
          <View style={styles.scoreRow}>
            <Text style={styles.score}>{readinessScore ?? '—'}</Text>
            <Text style={styles.scoreUnit}>/100</Text>
            <Badge text={readinessLabel} tone={readinessTone} />
          </View>
          <Text style={styles.scoreHint}>{t.scoreHint}</Text>
        </View>
        <ActivityRings move={move} exercise={exercise} recovery={recovery} size={120} />
      </View>

      {/* Mini trends */}
      <View style={styles.trendsRow}>
        {hrvStat && (
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>{t.hrvLabel}</Text>
            <View style={styles.trendValueRow}>
              <Text style={styles.trendValue}>{Math.round(hrvStat.latest)}ms</Text>
              <DeltaBadge delta={hrvStat.deltaPct} />
            </View>
          </View>
        )}
        {rhrStat && (
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>{t.pulseLabel}</Text>
            <View style={styles.trendValueRow}>
              <Text style={styles.trendValue}>{Math.round(rhrStat.latest)}bpm</Text>
              <DeltaBadge delta={rhrStat.deltaPct} />
            </View>
          </View>
        )}
        {sleepHrs && (
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>{t.sleepLabel}</Text>
            <View style={styles.trendValueRow}>
              <Text style={styles.trendValue}>{sleepHrs}h</Text>
            </View>
          </View>
        )}
      </View>

      {/* Recommendation */}
      {recommendation ? (
        <View style={styles.recommendation}>
          <InfoIcon size={14} color={colors.primary} />
          <Text style={styles.recommendationText}>{recommendation}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  overline: { ...typography.overline, color: colors.textSecondary },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  scoreCol: { flex: 1, gap: spacing.xs },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.xs },
  score: { ...typography.metricXL, color: colors.text },
  scoreUnit: { ...typography.bodySmall, color: colors.textSecondary },
  scoreHint: { ...typography.caption, color: colors.textSecondary },
  trendsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  trendItem: { flex: 1 },
  trendLabel: { ...typography.caption, color: colors.textSecondary, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  trendValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  trendValue: { ...typography.bodyStrong, color: colors.text, fontSize: 15 },
  delta: { fontSize: 11, fontWeight: '600' },
  recommendation: {
    backgroundColor: `${colors.primary}14`,
    borderRadius: radius.sm,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  recommendationText: { ...typography.caption, color: colors.primary, lineHeight: 18, flex: 1 },
});