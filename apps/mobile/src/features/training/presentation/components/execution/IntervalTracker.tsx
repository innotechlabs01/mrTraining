import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RunningInterval } from '../../../application/workoutExecutionTypes';
import { colors, spacing, typography, radius } from '../../../../shared/theme/tokens';

type IntervalTrackerProps = {
  intervals: RunningInterval[];
  currentIntervalIndex: number;
  elapsedSeconds: number;
  elapsedDistanceKm: number;
  onComplete: () => void;
  onAdvance: () => void;
  isOffRoute: boolean;
};

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function intensityColor(intensity?: string): string {
  switch (intensity) {
    case 'easy':
      return colors.success;
    case 'tempo':
      return '#FBBF24';
    case 'threshold':
      return '#F97316';
    case 'vo2max':
      return colors.error;
    default:
      return colors.textSecondary;
  }
}

export function IntervalTracker({
  intervals,
  currentIntervalIndex,
  elapsedSeconds,
  elapsedDistanceKm,
  onComplete,
  onAdvance,
  isOffRoute,
}: IntervalTrackerProps) {
  const current = intervals[currentIntervalIndex];
  const next = intervals[currentIntervalIndex + 1];
  const isLast = currentIntervalIndex >= intervals.length - 1;

  const progress = useMemo(() => {
    if (!current) return 0;
    if (current.workType === 'time') {
      return Math.min(1, elapsedSeconds / current.workValue);
    }
    return Math.min(1, elapsedDistanceKm / current.workValue);
  }, [current, elapsedSeconds, elapsedDistanceKm]);

  const remaining = useMemo(() => {
    if (!current) return 0;
    if (current.workType === 'time') {
      return Math.max(0, current.workValue - elapsedSeconds);
    }
    return Math.max(0, current.workValue - elapsedDistanceKm);
  }, [current, elapsedSeconds, elapsedDistanceKm]);

  const isIntervalDone =
    current &&
    ((current.workType === 'time' && elapsedSeconds >= current.workValue) ||
      (current.workType === 'distance' && elapsedDistanceKm >= current.workValue));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Intervalos</Text>
          {current && (
            <Text style={styles.counter}>
              {currentIntervalIndex + 1} / {intervals.length}
            </Text>
          )}
        </View>

        {isOffRoute && (
          <View style={styles.offRouteBanner}>
            <Text style={styles.offRouteText}>Fuera de la ruta — vuelve al recorrido</Text>
          </View>
        )}

        {current ? (
          <View style={styles.currentCard}>
            <View style={styles.currentHeader}>
              <Text style={styles.currentLabel}>
                {current.workType === 'time' ? 'Tiempo' : 'Distancia'}
              </Text>
              <Text style={styles.intensityBadge}>
                {current.intensity?.toUpperCase() || '–'}
              </Text>
            </View>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(progress * 100)}%` },
                ]}
              />
            </View>

            <View style={styles.timeRow}>
              <Text style={styles.timeLeft}>
                {current.workType === 'time'
                  ? formatClock(Math.round(remaining))
                  : remaining.toFixed(2) + ' km'}
              </Text>
              <Text style={styles.timeTotal}>
                /
                {current.workType === 'time'
                  ? formatClock(Math.round(current.workValue))
                  : current.workValue.toFixed(2) + ' km'}
              </Text>
            </View>

            {current.restSeconds > 0 && (
              <View style={styles.restRow}>
                <Text style={styles.restLabel}>Descanso tras intervalo</Text>
                <Text style={styles.restValue}>{current.restSeconds}s</Text>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={onAdvance}
              disabled={!isIntervalDone}
              style={[
                styles.advanceBtn,
                !isIntervalDone && styles.advanceBtnDisabled,
              ]}
            >
              <Text style={styles.advanceText}>
                {isIntervalDone ? 'Siguiente intervalo' : 'Completar intervalo'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {next && (
          <View style={styles.nextCard}>
            <Text style={styles.sectionTitle}>Siguiente</Text>
            <Text style={styles.nextDetail}>
              {next.workType === 'time'
                ? formatClock(Math.round(next.workValue))
                : next.workValue.toFixed(2) + ' km'}
              {next.restSeconds > 0 ? ` · ${next.restSeconds}s descanso` : ''}
            </Text>
          </View>
        )}

        {isLast && !current ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Todos los intervalos completados</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onComplete}
              style={styles.finishBtn}
            >
              <Text style={styles.finishText}>Finalizar entrenamiento</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: spacing.pagePadding, gap: spacing.lg },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
  },
  counter: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  offRouteBanner: {
    backgroundColor: colors.errorContainer,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  offRouteText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },
  currentCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  currentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  currentLabel: {
    ...typography.label,
    color: colors.text,
  },
  intensityBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  timeLeft: {
    ...typography.heading,
    color: colors.primary,
  },
  timeTotal: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  restRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  restLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  restValue: {
    ...typography.body,
    color: colors.text,
  },
  advanceBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 56,
  },
  advanceBtnDisabled: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  advanceText: {
    ...typography.button,
    color: colors.onPrimary,
  },
  nextCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nextDetail: {
    ...typography.body,
    color: colors.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  finishBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 56,
    width: '100%',
  },
  finishText: {
    ...typography.button,
    color: colors.onPrimary,
  },
});
