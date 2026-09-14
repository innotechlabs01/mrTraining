import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { FireIcon } from '../icons';

type Props = {
  count: number;
  inactive?: boolean;
};

export function StreakBadge({ count, inactive = false }: Props) {
  return (
    <View
      testID="streak-badge"
      style={[styles.badge, inactive && styles.inactive]}
      accessibilityLabel={`Racha de ${count} días`}
    >
      <FireIcon size={16} color={inactive ? colors.textSecondary : colors.primary} />
      <Text style={[styles.count, inactive && styles.countInactive]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  inactive: {
    backgroundColor: colors.surfaceRaised,
  },
  count: {
    ...typography.label,
    color: colors.primary,
  },
  countInactive: {
    color: colors.textSecondary,
  },
});
