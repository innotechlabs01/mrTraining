import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../../../../shared/theme/tokens';

type Props = {
  count: number;
  index: number;
};

export function OnboardingDots({ count, index }: Props) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === index
              ? styles.dotActive
              : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dotsRow: {
    flexDirection: 'row',

    gap: spacing.sm,

    alignItems: 'center',
  },
  dot: {
    height: 8,

    borderRadius: 4,
  },
  dotActive: {
    width: 24,

    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 8,

    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
});
