import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, shadows, spacing } from '../../../../shared/theme/tokens';
import { CountdownTimer } from '../../../../shared/components/ui/CountdownTimer';

type Props = {
  endDate: string;
};

/** Card wrapping the large countdown to the challenge end date. */
export function ChallengeCountdownCard({ endDate }: Props) {
  return (
    <View style={styles.card}>
      <CountdownTimer endDate={endDate} size="lg" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
});
