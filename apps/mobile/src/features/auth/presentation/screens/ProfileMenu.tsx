/**
 * ProfileMenu — presentational settings-style list.
 * Rows expose icon, title, optional current value and chevron. No logic.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { ChevronRightIcon } from '../../../../shared/components/icons';

export type MenuItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  /** Secondary text (current state, e.g. "Híbrido" / "L J · 08:00"). */
  value?: string | undefined;
};

export function ProfileMenu({ items, title }: { items: MenuItem[]; title?: string }) {
  return (
    <View>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.card}>
        {items.map((item, i) => (
          <View key={item.key}>
            {i > 0 ? <View style={styles.separator} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={item.onPress}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.iconCircle}>{item.icon}</View>
              <Text style={styles.label} numberOfLines={1}>
                {item.label}
              </Text>
              {item.value ? (
                <Text style={styles.value} numberOfLines={1}>
                  {item.value}
                </Text>
              ) : null}
              <ChevronRightIcon size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  groupTitle: {
    ...typography.overline,
    color: colors.textSecondary,
    marginLeft: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 56 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, ...typography.bodyStrong, color: colors.text },
  value: { ...typography.caption, color: colors.textSecondary, maxWidth: 120 },
  pressed: { opacity: 0.7 },
});