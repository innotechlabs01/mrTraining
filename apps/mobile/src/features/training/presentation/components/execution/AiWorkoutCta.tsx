import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, typography, shadows } from '../../../../../shared/theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
};

/** Primary AI entry point during execution: starts an AI form-check session. */
export function AiWorkoutCta({ label, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
    >
      <Text style={styles.ctaLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cta: {
    minHeight: 56,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  ctaLabel: { ...typography.bodyStrong, color: colors.primary, textTransform: 'uppercase' },
  pressed: { opacity: 0.8 },
});
