import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, shadows, radius } from '../../../../../shared/theme/tokens';
import { RestTimer } from '../../../../../shared/components/fitness/RestTimer';

type Props = {
  secondsLeft: number;
  skipLabel: string;
  onComplete: () => void;
  onSkip: () => void;
};

/** Full-screen rest timer overlay with a skippable countdown. */
export function RestOverlay({ secondsLeft, skipLabel, onComplete, onSkip }: Props) {
  return (
    <View style={styles.overlay}>
      <RestTimer duration={secondsLeft} onComplete={onComplete} size={180} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={skipLabel}
        onPress={onSkip}
        style={styles.skip}
      >
        <Text style={styles.skipLabel}>{skipLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${colors.base}E6`,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    zIndex: 10,
  },
  skip: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    ...shadows.sm,
  },
  skipLabel: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
});
