/**
 * RepCounter — displays and counts reps during exercise execution.
 * Only counts reps when form score meets a minimum threshold (default 60).
 * Supports manual increment/decrement and override.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography, shadows, layout } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.repCounter;

const FORM_THRESHOLD_DEFAULT = 60;

export type RepCounterProps = {
  currentReps: number;
  targetReps: number;
  formScore: number;
  formThreshold?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  isAutoCount?: boolean;
};

export function RepCounter({
  currentReps,
  targetReps,
  formScore,
  formThreshold = FORM_THRESHOLD_DEFAULT,
  onIncrement,
  onDecrement,
  isAutoCount = false,
}: RepCounterProps) {
  const formValid = formScore >= formThreshold;
  const repsComplete = currentReps >= targetReps;

  const handleIncrement = useCallback(() => {
    if (formValid || !isAutoCount) {
      onIncrement();
    }
  }, [formValid, isAutoCount, onIncrement]);

  return (
    <Card variant="premium" style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{t.label}</Text>
        <View style={[styles.formBadge, formValid ? styles.formValid : styles.formInvalid]}>
          <Text style={styles.formBadgeText}>
            {formValid ? t.formOk : t.formBad}
          </Text>
        </View>
      </View>

      <View style={styles.counterRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.decrementA11y}
          onPress={onDecrement}
          style={styles.button}
        >
          <Text style={styles.buttonText}>-</Text>
        </Pressable>

        <View style={styles.repsDisplay}>
          <Text style={[styles.repsNumber, repsComplete && styles.repsComplete]}>
            {currentReps}
          </Text>
          <Text style={styles.repsTarget}>/ {targetReps}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.incrementA11y}
          onPress={handleIncrement}
          style={[styles.button, !formValid && isAutoCount && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>

      {isAutoCount && !formValid ? (
        <Text style={styles.hint}>{t.lowFormHint}</Text>
      ) : null}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  formBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  formValid: {
    backgroundColor: `${colors.success}20`,
    borderWidth: 1,
    borderColor: colors.success,
  },
  formInvalid: {
    backgroundColor: `${colors.error}20`,
    borderWidth: 1,
    borderColor: colors.error,
  },
  formBadgeText: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    marginVertical: spacing.xs,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...typography.heroMetric,
    color: colors.text,
  },
  repsDisplay: {
    alignItems: 'center',
    minWidth: 100,
  },
  repsNumber: {
    ...typography.heroMetric,
    color: colors.text,
  },
  repsComplete: {
    color: colors.success,
  },
  repsTarget: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
  },
  hint: {
    ...typography.caption,
    color: colors.warning,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
