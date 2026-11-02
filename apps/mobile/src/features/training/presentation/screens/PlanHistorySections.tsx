import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius, fontFamilies } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { Badge } from '../../../../shared/components/ui/Badge';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { ProgressBar } from '../../../../shared/components/ui/ProgressBar';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.planHistorySections;

export type ProgressSummary = {
  athleteId: string;
  startDate: string;
  endDate: string;
  workoutsCompleted: number;
  totalVolume: number;
  avgCompletionRate: number; // 0-100 percent
  streak: number;
};

export type WorkoutHistoryItem = {
  id: string;
  contentName: string;
  contentType: string;
  modality: string;
  startDate: string;
  status: string;
  progress: number;
};

type Filter = 'all' | 'completed' | 'pending';
type BadgeTone = 'primary' | 'success' | 'warning' | 'error' | 'neutral';

function toneForStatus(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'confirmed' || s === 'active') return 'success';
  if (s === 'pending' || s === 'scheduled') return 'warning';
  return 'neutral';
}

export function WeeklySummarySection({
  loading,
  summary,
}: {
  loading: boolean;
  summary: ProgressSummary | undefined;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t.weekTitle}</Text>
      {loading ? (
        <EmptyState variant="loading" message={t.loadingProgress} />
      ) : !summary ? (
        <EmptyState variant="empty" message={t.noProgress} />
      ) : (
        <Card>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t.workoutsCompleted}</Text>
            <Text style={styles.summaryValue}>{summary.workoutsCompleted}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t.totalVolume}</Text>
            <Text style={styles.summaryValue}>{summary.totalVolume.toFixed(0)} kg</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t.avgCompleted}</Text>
            <Text style={styles.summaryValue}>{summary.avgCompletionRate.toFixed(1)}%</Text>
          </View>
          <View style={styles.progressWrap}>
            <ProgressBar progress={summary.avgCompletionRate / 100} />
          </View>
          <View style={styles.streakRow}>
            <Text style={styles.streakLabel}>{t.streakLabel}</Text>
            <Badge text={`${summary.streak} ${t.streakUnit}${summary.streak === 1 ? '' : 's'}`} tone="primary" />
          </View>
        </Card>
      )}
    </View>
  );
}

export function HistorySection({
  loading,
  items,
  onOpen,
}: {
  loading: boolean;
  items: WorkoutHistoryItem[];
  onOpen: (id: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = items.filter((w) => {
    if (filter === 'completed') return w.status === 'completed';
    if (filter === 'pending') return w.status !== 'completed';
    return true;
  });

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t.historyTitle}</Text>

      {/* Filtros segmentados */}
      <View style={styles.segmentRow}>
        {(['all', 'completed', 'pending'] as Filter[]).map((f) => {
          const active = filter === f;
          const label = f === 'all' ? t.filterAll : f === 'completed' ? t.filterCompleted : t.filterPending;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
            >
              <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <EmptyState variant="loading" message={t.loadingWorkouts} />
      ) : items.length === 0 || filtered.length === 0 ? (
        <EmptyState variant="empty" />
      ) : (
        filtered.map((w) => {
          const completed = w.status === 'completed';
          const dotColor = completed ? colors.success : colors.warning;
          return (
            <Pressable
              key={w.id}
              onPress={() => onOpen(w.id)}
              style={({ pressed }) => (pressed ? styles.pressed : undefined)}
            >
              <Card style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <View style={styles.nameRow}>
                      <View style={[styles.dot, { backgroundColor: dotColor }]} />
                      <Text style={styles.workoutName} numberOfLines={1}>
                        {w.contentName}
                      </Text>
                    </View>
                    <Text style={styles.workoutMeta}>{w.startDate}</Text>
                  </View>
                  <Badge text={w.status} tone={toneForStatus(w.status)} />
                </View>

                <ProgressBar progress={completed ? 1 : w.progress / 100} />
              </Card>
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  segmentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  pill: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: `${colors.primary}1A`,
    borderColor: `${colors.primary}33`,
  },
  pillInactive: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  pillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  pillTextActive: { color: colors.primary },
  pillTextInactive: { color: colors.textSecondary },
  card: { marginBottom: spacing.sm },
  pressed: { opacity: 0.8 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardLeft: { flex: 1, gap: spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: radius.full },
  workoutName: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '600', lineHeight: 20 },
  workoutMeta: { fontSize: 12, color: colors.textSecondary, fontWeight: '400' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 14, color: colors.text, fontWeight: '700' },
  progressWrap: { marginBottom: spacing.md },
  streakRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streakLabel: { fontSize: 13, color: colors.textSecondary },
});