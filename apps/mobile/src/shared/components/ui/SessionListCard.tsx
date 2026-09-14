import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, layout, radius, spacing, typography } from '../../theme/tokens';
import { BarbellIcon, PlayIcon, ChevronRightIcon } from '../icons';
import { ProgressBar } from './ProgressBar';

type Props = {
  title: string;
  meta?: string;
  /** Real progress 0..1 from backend, or null → show '—' (never fake a 0/partial). */
  progress?: number | null;
  duration?: string;
  onPress?: () => void;
};

/** Workout/session row with real progress. No fabricated values. */
export function SessionListCard({ title, meta, progress, duration, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed]}
    >
      <View style={styles.leading}>
        <BarbellIcon size={20} color={colors.textSecondary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta ?? (duration ? `${duration}` : ' ')}
        </Text>
        {progress != null ? <ProgressBar progress={progress} /> : <Text style={styles.noData}>—</Text>}
      </View>
      {onPress ? (
        <View style={styles.trailing}>
          <PlayIcon size={18} color={colors.primary} />
          <ChevronRightIcon size={16} color={colors.textSecondary} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.touchTarget + 16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  leading: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: spacing.sm },
  title: { ...typography.bodyStrong, color: colors.text, fontSize: 15 },
  meta: { ...typography.caption, color: colors.textSecondary },
  noData: { ...typography.caption, color: colors.border, fontSize: 14 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pressed: { backgroundColor: colors.surfaceRaised },
});
