import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, layout, radius, spacing, typography } from '../../theme/tokens';
import { ChevronRightIcon } from '../icons';

type Props = {
  title: string;
  subtitle?: string;
  leadingIcon?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  /** Separator hairline below except last. */
  last?: boolean;
};

/** Standard tappable list row: [leading icon] [title] [subtitle?] [trailing]. */
export function ListCard({ title, subtitle, leadingIcon, trailing, onPress, last = false }: Props) {
  const showChevron = onPress != null && trailing == null;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed, !last && styles.separator]}
    >
      {leadingIcon ? <View style={styles.leading}>{leadingIcon}</View> : null}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? (showChevron ? <ChevronRightIcon size={20} color={colors.textSecondary} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.touchTarget + 8,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  separator: { borderBottomWidth: 0 },
  leading: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  title: { ...typography.bodyStrong, color: colors.text, fontSize: 15 },
  subtitle: { ...typography.caption, color: colors.textSecondary },
  pressed: { backgroundColor: colors.surfaceRaised },
});
