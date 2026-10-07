import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../../../../shared/theme/tokens';
import { FireIcon, TrendUpIcon } from '../../../../shared/components/icons';

type Props = {
  title: string;
  description?: string | null | undefined;
  exerciseType?: string | undefined;
  /** Localized scoring-type label; row hidden when null. */
  scoreTypeLabel: string | null;
};

/** Challenge header: title, description, exercise badge, scoring-type badge. */
export function ChallengeHeaderCard({ title, description, exerciseType, scoreTypeLabel }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
      <View style={styles.metaRow}>
        <View style={styles.exerciseBadge}>
          <FireIcon size={14} color={colors.primary} />
          <Text style={styles.exerciseText}>{exerciseType}</Text>
        </View>
        {scoreTypeLabel ? (
          <View style={styles.scoreBadge}>
            <TrendUpIcon size={14} color={colors.secondary} />
            <Text style={styles.scoreBadgeText}>{scoreTypeLabel}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  exerciseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  exerciseText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(59, 158, 255, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  scoreBadgeText: {
    ...typography.bodySmall,
    color: colors.secondary,
    fontWeight: '600',
  },
});
