/**
 * FormAnalyzer — displays AI-powered form quality analysis during workout execution.
 *
 * Integrates with MediaPipe pose detection (third-party) to provide real-time
 * form quality scoring and feedback. Shows a score 0-100 with color-coded
 * indicator and key form metrics breakdown.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';

export type FormMetrics = {
  depth: number; // 0-100
  alignment: number; // 0-100
  tempo: number; // 0-100
};

export type FormAnalyzerProps = {
  score: number; // 0-100
  metrics: FormMetrics;
  feedback: string | null;
  isActive?: boolean;
};

function getScoreColor(score: number): string {
  if (score >= 80) return colors.success;
  if (score >= 60) return colors.warning;
  return colors.error;
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Buena';
  if (score >= 60) return 'Aceptable';
  return 'Mejorar';
}

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricBarTrack}>
        <View
          style={[
            styles.metricBarFill,
            { width: `${value}%`, backgroundColor: getScoreColor(value) },
          ]}
        />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export function FormAnalyzer({ score, metrics, feedback, isActive = true }: FormAnalyzerProps) {
  if (!isActive) return null;

  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreNumber, { color: scoreColor }]}>{score}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>FORMA</Text>
          <Text style={[styles.scoreLabel, { color: scoreColor }]}>{scoreLabel}</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <MetricBar label="Profundidad" value={metrics.depth} />
        <MetricBar label="Alineación" value={metrics.alignment} />
        <MetricBar label="Tempo" value={metrics.tempo} />
      </View>

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    ...typography.metricMD,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.label,
    color: colors.textSecondary,
  },
  scoreLabel: {
    ...typography.bodyStrong,
  },
  metrics: {
    gap: spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    width: 80,
  },
  metricBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  metricValue: {
    ...typography.caption,
    color: colors.text,
    width: 30,
    textAlign: 'right',
  },
  feedback: {
    ...typography.bodySmall,
    color: colors.primary,
    fontStyle: 'italic',
  },
});
