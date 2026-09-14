import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { TrophyIcon, LockIcon } from '../icons';

type Props = {
  title: string;
  unlocked: boolean;
  unlockedAt?: Date;
};

export function AchievementBadge({ title, unlocked, unlockedAt }: Props) {
  return (
    <View
      testID="achievement-badge"
      style={[styles.badge, !unlocked && styles.locked]}
      accessibilityLabel={
        unlocked
          ? `Logro desbloqueado: ${title}`
          : `Logro bloqueado: ${title}`
      }
    >
      <View style={[styles.iconCircle, !unlocked && styles.iconCircleLocked]}>
        {unlocked ? (
          <TrophyIcon size={20} color={colors.primary} />
        ) : (
          <LockIcon size={20} color={colors.textSecondary} />
        )}
      </View>
      <Text style={[styles.title, !unlocked && styles.titleLocked]} numberOfLines={2}>
        {title}
      </Text>
      {unlocked && unlockedAt && (
        <Text style={styles.date}>
          {unlockedAt.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 80,
  },
  locked: {
    opacity: 0.5,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleLocked: {
    backgroundColor: colors.surfaceRaised,
  },
  title: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
  },
  titleLocked: {
    color: colors.textSecondary,
  },
  date: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 9,
  },
});
