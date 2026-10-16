/**
 * FormAnalyzer — displays AI-powered form quality analysis during workout execution.
 *
 * Integrates with MediaPipe pose detection (third-party) to provide real-time
 * form quality scoring and feedback. Shows a score 0-100 with color-coded
 * indicator and key form metrics breakdown.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography, shadows } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.formAnalyzer;

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
  /** Analyzer confidence 0-1. If below threshold, shows low-confidence state. */
  confidence?: number;
  /** Explicit error state from the analyzer pipeline. */
  isError?: boolean;
  /** Error message when isError is true. */
  errorMessage?: string;
};

function getScoreColor(score: number): string {
  if (score >= 80) return colors.success;
  if (score >= 60) return colors.warning;
  return colors.error;
}

function getScoreLabel(score: number): string {
  if (score >= 80) return t.scoreGood;
  if (score >= 60) return t.scoreOk;
  return t.scoreBad;
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

export function FormAnalyzer({ score, metrics, feedback, isActive = true, confidence, isError, errorMessage }: FormAnalyzerProps) {
  if (!isActive) return null;

  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);

  // Low confidence threshold - below 0.5 shows low confidence warning
  const LOW_CONFIDENCE_THRESHOLD = 0.5;
  const isLowConfidence = confidence !== undefined && confidence < LOW_CONFIDENCE_THRESHOLD;

  return (
    <Card variant="premium" style={styles.container}>
      {isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage ?? t.errorGeneric}</Text>
        </View>
      )}
      {isLowConfidence && !isError && (
        <View style={styles.lowConfidenceBanner}>
          <Text style={styles.lowConfidenceText}>{t.lowConfidence}</Text>
        </View>
      )}
      <View style={styles.header}>
        <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreNumber, { color: scoreColor }]}>{isError || isLowConfidence ? '—' : score}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={[styles.scoreLabel, { color: scoreColor }]}>{isError || isLowConfidence ? t.statusUnavailable : scoreLabel}</Text>
        </View>
      </View>

      {!isError && !isLowConfidence && (
        <View style={styles.metrics}>
          <MetricBar label={t.depthLabel} value={metrics.depth} />
          <MetricBar label={t.alignmentLabel} value={metrics.alignment} />
          <MetricBar label={t.tempoLabel} value={metrics.tempo} />
        </View>
      )}

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    ...typography.heroMetric,
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
    gap: spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    width: 80,
  },
  metricBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  metricValue: {
    ...typography.bodyStrong,
    color: colors.text,
    width: 36,
    textAlign: 'right',
  },
  feedback: {
    ...typography.bodySmall,
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  errorBanner: {
    backgroundColor: `${colors.error}1A`,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
  },
  lowConfidenceBanner: {
    backgroundColor: `${colors.warning}1A`,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  lowConfidenceText: {
    ...typography.bodySmall,
    color: colors.warning,
    textAlign: 'center',
  },
});
