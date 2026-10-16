/**
 * WeightInput — dedicated weight input for workout execution.
 * Supports quick increment/decrement buttons and manual text input.
 * Validates non-negative values within a reasonable range.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography, shadows, layout } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { texts } from '../../../../shared/i18n/texts';

export type WeightInputProps = {
  value: number;
  prescribedWeight?: number | null | undefined;
  onChange: (weight: number) => void;
  unit?: string;
  step?: number;
};

const QUICK_STEPS = [-5, -2.5, 2.5, 5];
const MIN_WEIGHT = 0;
const MAX_WEIGHT = 500;

export function WeightInput({
  value,
  prescribedWeight,
  onChange,
  unit = 'kg',
}: WeightInputProps) {
  const [inputText, setInputText] = useState(value.toString());

  const handleQuickStep = useCallback(
    (delta: number) => {
      const next = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, value + delta));
      onChange(next);
      setInputText(next.toString());
    },
    [value, onChange],
  );

  // Pre-create handlers for each delta to avoid re-creating on render
  const handleQuickSteps = useMemo(
    () => QUICK_STEPS.map((delta) => ({
      delta,
      onPress: () => {
        const next = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, value + delta));
        onChange(next);
        setInputText(next.toString());
      },
    })),
    [value, onChange],
  );

  const handleTextChange = useCallback((text: string) => {
    setInputText(text);
  }, []);

  const handleTextEnd = useCallback(() => {
    const parsed = parseFloat(inputText);
    if (Number.isNaN(parsed)) {
      setInputText(value.toString());
      return;
    }
    const clamped = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, parsed));
    onChange(clamped);
    setInputText(clamped.toString());
  }, [inputText, value, onChange]);

  const hasPrescription = prescribedWeight != null && prescribedWeight > 0;

  return (
    <Card variant="premium" style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{texts.screens.weightInput.weightLabel}</Text>
        {hasPrescription ? (
          <Text style={styles.prescribed}>Prescrito: {prescribedWeight} {unit}</Text>
        ) : null}
      </View>

      <View style={styles.inputRow}>
        {handleQuickSteps.map((step) => (
          <Pressable
            key={step.delta}
            accessibilityRole="button"
            accessibilityLabel={`${step.delta > 0 ? 'Más' : 'Menos'} ${Math.abs(step.delta)} ${unit}`}
            onPress={step.onPress}
            style={styles.quickButton}
          >
            <Text style={styles.quickButtonText}>
              {step.delta > 0 ? '+' : ''}{step.delta}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.mainInput}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={handleTextChange}
          onBlur={handleTextEnd}
          keyboardType="numeric"
          inputMode="numeric"
          placeholder="0"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={`${texts.screens.weightInput.weightA11yPrefix} ${unit}`}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
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
  prescribed: {
    ...typography.caption,
    color: colors.primary,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  quickButton: {
    width: 56,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  quickButtonText: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 14,
  },
  mainInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  textInput: {
    ...typography.heroMetric,
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minWidth: 140,
    textAlign: 'center',
  },
  unit: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
