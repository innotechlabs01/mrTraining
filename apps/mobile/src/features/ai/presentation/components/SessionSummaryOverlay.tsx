import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius } from '../../../../shared/theme/tokens';
import type { AiSessionSummary, VelocityTrend } from '../hooks/useSessionSummary';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.sessionSummaryOverlay;

interface Props {
  summary: AiSessionSummary;
  visible: boolean;
}

const TREND_LABEL: Record<VelocityTrend, string> = {
  up: t.trendUp,
  down: t.trendDown,
  flat: t.trendFlat,
};

function row(label: string, value: string): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function SessionSummaryOverlay({ summary, visible }: Props): React.JSX.Element | null {
  if (!visible) return null;
  return (
    <View style={styles.overlay} accessibilityRole="summary" accessibilityLabel={t.a11y}>
      <Text style={styles.title}>{t.title}</Text>
      {row(t.exercise, summary.exercise)}
      {row(t.target, String(summary.target))}
      {row(t.repsCompleted, String(summary.completed))}
      {row(t.rejected, String(summary.rejected))}
      {row(t.avgForm, `${summary.avgForm} %`)}
      {row(t.bestForm, `${summary.bestForm} %`)}
      {row(t.avgRom, `${summary.avgRom}°`)}
      {row(t.avgTempo, `${summary.avgTempoMs} ms`)}
      {row(t.velocity, TREND_LABEL[summary.velocityTrend])}
      {row(t.failureProximity, `${Math.round(summary.failureProximity * 100)} %`)}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    width: '86%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceRaised,
  },
  title: {
    color: colors.primary,
    ...typography.title,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  label: {
    color: colors.onSurfaceVariant,
    ...typography.bodySmall,
  },
  value: {
    color: colors.text,
    ...typography.bodySmall,
    fontVariant: ['tabular-nums'],
  },
});