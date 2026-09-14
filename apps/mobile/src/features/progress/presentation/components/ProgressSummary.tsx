import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { StatGrid } from '../../../../shared/components/ui/StatGrid';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';

type ActiveWorkout = { id: string; contentName: string; modality: string; status: string; progress: number };

type ProgressData = {
  readiness: { sleep: number; hrv: number; recovery: number; score: number };
  todaySessions: Array<{ id: string; name: string; time: string; endTime: string; location: string; status: string }>;
  activeWorkouts: ActiveWorkout[];
} | undefined;

/** Weekly activity bars from real workout progress. Never fabricated values. */
function WeeklyBars({ workouts }: { workouts: ActiveWorkout[] }) {
  if (workouts.length === 0) {
    return (
      <EmptyState
        variant="empty"
        title="Sin datos todavía"
        message="Registra sesiones para ver tu progreso semanal."
      />
    );
  }
  const values = workouts.slice(0, 7);
  const max = Math.max(...values.map((w) => w.progress), 1);
  return (
    <View style={styles.chart}>
      {values.map((w) => {
        const pct = Math.max(4, Math.round((w.progress / max) * 100));
        return (
          <View key={w.id} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: `${pct}%` as `${number}%` }]} />
            </View>
            <Text style={styles.barValue}>{Math.round(w.progress * 100)}%</Text>
          </View>
        );
      })}
    </View>
  );
}

export function ProgressSummary({ data, loading }: { data: ProgressData; loading: boolean }) {
  if (loading) {
    return <StatGrid loading metrics={[]} cols={2} />;
  }

  return (
    <View style={styles.wrap}>
      <StatGrid
        metrics={[
          { label: 'Sesiones', value: data ? String(data.activeWorkouts?.length ?? 0) : null },
          { label: 'Readiness', value: data?.readiness?.score != null ? String(data.readiness.score) : null },
        ]}
        cols={2}
      />
      <Text style={styles.sectionTitle}>Actividad de la semana</Text>
      {data ? <WeeklyBars workouts={data.activeWorkouts ?? []} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  sectionTitle: { ...typography.h4, color: colors.text, marginTop: spacing.sm },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    height: 160,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4, height: '100%' },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  barFill: { width: '100%', backgroundColor: colors.primary, borderRadius: radius.sm, minHeight: 4 },
  barValue: { ...typography.caption, color: colors.textSecondary },
});
