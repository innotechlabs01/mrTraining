/**
 * WeightInput — dedicated weight input for workout execution.
 * Supports quick increment/decrement buttons and manual text input.
 * Validates non-negative values within a reasonable range.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';

export type WeightInputProps = {
  value: number;
  prescribedWeight?: number | null;
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
  step = 2.5,
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
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>PESO</Text>
        {hasPrescription ? (
          <Text style={styles.prescribed}>Prescrito: {prescribedWeight} {unit}</Text>
        ) : null}
      </View>

      <View style={styles.inputRow}>
        {QUICK_STEPS.map((delta) => (
          <Pressable
            key={delta}
            accessibilityRole="button"
            accessibilityLabel={`${delta > 0 ? 'Más' : 'Menos'} ${Math.abs(delta)} ${unit}`}
            onPress={() => handleQuickStep(delta)}
            style={styles.quickButton}
          >
            <Text style={styles.quickButtonText}>
              {delta > 0 ? '+' : ''}{delta}
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
          accessibilityLabel={`Peso en ${unit}`}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  quickButton: {
    width: 48,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickButtonText: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  mainInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  textInput: {
    ...typography.metricLG,
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minWidth: 120,
    textAlign: 'center',
  },
  unit: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
