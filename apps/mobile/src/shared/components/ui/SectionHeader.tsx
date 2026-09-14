import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, layout, spacing, typography } from '../../theme/tokens';
import { ChevronRightIcon } from '../icons';

type Action = { label: string; onPress: () => void };

type Props = {
  title: string;
  icon?: React.ReactNode;
  action?: Action;
  trailing?: React.ReactNode;
};

/** Standardized section label + optional "Ver todo" / trailing control. */
export function SectionHeader({ title, icon, action, trailing }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {icon}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          hitSlop={8}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionLabel}>{action.label}</Text>
          <ChevronRightIcon size={16} color={colors.primary} />
        </Pressable>
      ) : (
        trailing ?? null
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: layout.touchTarget,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  title: { ...typography.h4, color: colors.text, flexShrink: 1 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: layout.touchTarget, paddingLeft: spacing.sm },
  actionLabel: { ...typography.caption, fontWeight: '600', color: colors.textSecondary },
  pressed: { opacity: 0.7 },
});
