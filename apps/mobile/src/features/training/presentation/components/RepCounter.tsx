/**
 * RepCounter — displays and counts reps during exercise execution.
 * Only counts reps when form score meets a minimum threshold (default 60).
 * Supports manual increment/decrement and override.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';

export type RepCounterProps = {
  currentReps: number;
  targetReps: number;
  formScore: number;
  formThreshold?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  isAutoCount?: boolean;
};

const FORM_THRESHOLD_DEFAULT = 60;

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
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>REPS</Text>
        <View style={[styles.formBadge, formValid ? styles.formValid : styles.formInvalid]}>
          <Text style={styles.formBadgeText}>
            {formValid ? 'Forma OK' : 'Forma baja'}
          </Text>
        </View>
      </View>

      <View style={styles.counterRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Decrementar reps"
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
          accessibilityLabel="Incrementar reps"
          onPress={handleIncrement}
          style={[styles.button, !formValid && isAutoCount && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>

      {isAutoCount && !formValid ? (
        <Text style={styles.hint}>Reps no se cuentan con forma baja</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  formBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  formValid: {
    backgroundColor: `${colors.success}20`,
  },
  formInvalid: {
    backgroundColor: `${colors.error}20`,
  },
  formBadgeText: {
    ...typography.caption,
    color: colors.text,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...typography.h2,
    color: colors.text,
  },
  repsDisplay: {
    alignItems: 'center',
    minWidth: 80,
  },
  repsNumber: {
    ...typography.metricLG,
    color: colors.text,
  },
  repsComplete: {
    color: colors.success,
  },
  repsTarget: {
    ...typography.body,
    color: colors.textSecondary,
  },
  hint: {
    ...typography.caption,
    color: colors.warning,
    textAlign: 'center',
  },
});
