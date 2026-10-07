import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../../../shared/theme/tokens';
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
      <RestTimer duration={secondsLeft} onComplete={onComplete} />
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
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  skipLabel: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
});
