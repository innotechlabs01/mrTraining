/**
 * Athlete Today Summary — personalized dashboard for the athlete's landing screen.
 *
 * Shows real data from their wearable + training history:
 *   - Real readiness (from health metrics, not mock)
 *   - PRs from their training history
 *   - Video assignment status
 *   - Recommendation based on fatigue + recovery
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, typography } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { Badge } from '../../../../shared/components/ui/Badge';
import { InfoIcon } from '../../../../shared/components/icons';

type HealthMetric = { metricType: string; value: number; unit: string; source: string; recordedAt: string };
type SleepLog = { date: string; totalMinutes: number; deepMinutes?: number; remMinutes?: number };
type HealthData = {
  hrv: HealthMetric[];
  restingHr: HealthMetric[];
  sleepLogs: SleepLog[];
  manualReadiness: HealthMetric[];
};

type TrainingData = {
  recentSessions: Array<{ date: string; workoutName: string }>;
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
 * Personalized today summary for the athlete. Fetches real health + training data
 * and shows readiness, trends, and a recommendation.
 */
export function AthleteTodaySummary({ athleteId }: { athleteId: string }) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [training, setTraining] = useState<TrainingData | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClient.get('/athlete/health/metrics?days=8').then(r => r.data).catch(() => null),
      apiClient.get('/athlete/health/sleep?days=8').then(r => r.data).catch(() => null),
      apiClient.get('/athlete/today').then(r => r.data).catch(() => null),
    ]).then(([metricsRes, sleepRes, todayRes]) => {
      if (cancelled) return;
      const allMetrics: HealthMetric[] = metricsRes?.metrics ?? [];
      setHealth({
        hrv: allMetrics.filter(m => m.metricType === 'hrv'),
        restingHr: allMetrics.filter(m => m.metricType === 'resting_hr'),
        sleepLogs: sleepRes?.sleepLogs ?? [],
        manualReadiness: allMetrics.filter(m => m.metricType === 'manual_readiness'),
      });
      setTraining({
        recentSessions: todayRes?.todaySessions ?? [],
      });
    });
    return () => { cancelled = true; };
  }, [athleteId]);

  if (!health) return null;

  const hrvStat = latestVsBaseline(health.hrv);
  const rhrStat = latestVsBaseline(health.restingHr);
  const lastNight = health.sleepLogs.sort((a, b) => b.date.localeCompare(a.date))[0];
  const sleepHrs = lastNight ? (lastNight.totalMinutes / 60).toFixed(1) : null;

  // Compute readiness from real data
  let readinessScore: number | null = null;
  if (hrvStat && lastNight) {
    const sleepScore = Math.min(100, (lastNight.totalMinutes / 480) * 100);
    const hrvScore = Math.min(100, (hrvStat.latest / Math.max(hrvStat.latest / (1 + (hrvStat.deltaPct ?? 0) / 100), 1)) * 50);
    readinessScore = Math.round(0.5 * sleepScore + 0.5 * hrvScore);
  }

  // Recommendation
  let recommendation = '';
  if (readinessScore != null && readinessScore >= 80) {
    recommendation = 'Buen momento para sesión de alta intensidad';
  } else if (readinessScore != null && readinessScore >= 60) {
    recommendation = 'Sesión moderada — escucha a tu cuerpo';
  } else if (readinessScore != null) {
    recommendation = 'Prioriza descanso y recuperación hoy';
  } else if (hrvStat && hrvStat.deltaPct != null && hrvStat.deltaPct < -10) {
    recommendation = 'Tu HRV está bajo tu promedio — sesiones suaves';
  } else if (lastNight && lastNight.totalMinutes < 420) {
    recommendation = 'Dormiste menos de 7 horas — cuidado con la carga';
  }

  return (
    <Card style={styles.container}>
      {/* Readiness */}
      {readinessScore != null && (
        <View style={styles.readinessRow}>
          <View style={[styles.scoreDot, { backgroundColor: readinessScore >= 80 ? colors.success : readinessScore >= 60 ? colors.warning : colors.error }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.readinessLabel}>Tu readiness hoy</Text>
            <Text style={styles.readinessValue}>{readinessScore}/100</Text>
          </View>
          <Badge
            text={readinessScore >= 80 ? 'Listo' : readinessScore >= 60 ? 'Moderado' : 'Descansar'}
            tone={readinessScore >= 80 ? 'success' : readinessScore >= 60 ? 'warning' : 'error'}
          />
        </View>
      )}

      {/* Trends */}
      <View style={styles.trendsRow}>
        {hrvStat && (
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>HRV</Text>
            <View style={styles.trendValueRow}>
              <Text style={styles.trendValue}>{Math.round(hrvStat.latest)}ms</Text>
              <DeltaBadge delta={hrvStat.deltaPct} />
            </View>
          </View>
        )}
        {rhrStat && (
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>Pulso</Text>
            <View style={styles.trendValueRow}>
              <Text style={styles.trendValue}>{Math.round(rhrStat.latest)}bpm</Text>
              <DeltaBadge delta={rhrStat.deltaPct} />
            </View>
          </View>
        )}
        {sleepHrs && (
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>Sueño</Text>
            <Text style={styles.trendValue}>{sleepHrs}h</Text>
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
  container: { padding: spacing.md, gap: spacing.md, marginBottom: spacing.md },
  readinessRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scoreDot: { width: 10, height: 10, borderRadius: 5 },
  readinessLabel: { ...typography.caption, color: colors.textSecondary },
  readinessValue: { ...typography.bodyStrong, color: colors.text, fontSize: 18 },
  trendsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  trendItem: { flex: 1 },
  trendLabel: { ...typography.caption, color: colors.textSecondary, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  trendValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  trendValue: { ...typography.bodyStrong, color: colors.text, fontSize: 15 },
  delta: { fontSize: 11, fontWeight: '600' },
  recommendation: {
    backgroundColor: `${colors.primary}14`,
    borderRadius: 8,
    padding: spacing.sm,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  recommendationText: { ...typography.caption, color: colors.primary, lineHeight: 18 },
});
