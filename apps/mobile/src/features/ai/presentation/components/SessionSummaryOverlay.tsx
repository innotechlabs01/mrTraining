import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius } from '../../../../shared/theme/tokens';
import type { AiSessionSummary, VelocityTrend } from '../hooks/useSessionSummary';

interface Props {
  summary: AiSessionSummary;
  visible: boolean;
}

const TREND_LABEL: Record<VelocityTrend, string> = {
  up: 'en subida',
  down: 'en bajada',
  flat: 'estable',
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
    <View style={styles.overlay} accessibilityRole="summary" accessibilityLabel="Resumen de sesión">
      <Text style={styles.title}>Sesión completada</Text>
      {row('Ejercicio', summary.exercise)}
      {row('Objetivo', String(summary.target))}
      {row('Repeticiones completadas', String(summary.completed))}
      {row('Rechazadas', String(summary.rejected))}
      {row('Forma media', `${summary.avgForm} %`)}
      {row('Mejor forma', `${summary.bestForm} %`)}
      {row('ROM promedio', `${summary.avgRom}°`)}
      {row('Tempo promedio', `${summary.avgTempoMs} ms`)}
      {row('Velocidad', TREND_LABEL[summary.velocityTrend])}
      {row('Proximidad a fallo', `${Math.round(summary.failureProximity * 100)} %`)}
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