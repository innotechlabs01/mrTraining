import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, typography } from '../../../../../shared/theme/tokens';

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
      style={styles.cta}
    >
      <Text style={styles.ctaLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cta: {
    minHeight: 44,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: { ...typography.bodyStrong, color: colors.primary, textTransform: 'uppercase' },
});
