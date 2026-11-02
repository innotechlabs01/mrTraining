import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../../../shared/theme/tokens';

type Props = {
  count: number;
  accessibilityLabel?: string;
};

/** Non-blocking header badge showing the number of pending sync items. */
export function PendingSyncBadge({ count, accessibilityLabel }: Props) {
  return (
    <View
      style={styles.badge}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
    >
      <Text style={styles.text}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  text: {
    ...typography.caption,
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 10,
  },
});
