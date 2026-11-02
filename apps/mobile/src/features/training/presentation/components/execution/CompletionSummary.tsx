import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../../../shared/theme/tokens';
import { Card } from '../../../../../shared/components/ui/Card';
import { TrophyIcon } from '../../../../../shared/components/icons';
import { AchievementBadge } from '../../../../../shared/components/gamification/AchievementBadge';
import { PRCelebrationAnimation } from '../../../../../shared/components/gamification/PRCelebrationAnimation';
import type { CompletedPr } from '../../../application/workoutExecutionTypes';

type Props = {
  workoutName: string;
  durationText: string;
  statsText: string;
  prs: CompletedPr[];
  badgeIds: string[];
  showPrAnimation: boolean;
  onPrAnimationComplete: () => void;
  labels: {
    completeLabel: string;
    newPrsLabel: string;
    doneLabel: string;
  };
  onDone: () => void;
};

/** Post-workout summary: duration, stats, PRs, badges, and a done CTA. */
export function CompletionSummary({
  workoutName,
  durationText,
  statsText,
  prs,
  badgeIds,
  showPrAnimation,
  onPrAnimationComplete,
  labels,
  onDone,
}: Props) {
  return (
    <View style={styles.wrap}>
      <PRCelebrationAnimation
        visible={showPrAnimation}
        onComplete={onPrAnimationComplete}
      />
      <Card style={styles.card}>
        <Text style={styles.label}>{labels.completeLabel}</Text>
        <Text style={styles.title}>{workoutName}</Text>
        <Text style={styles.time}>{durationText}</Text>
        <Text style={styles.meta}>{statsText}</Text>
        {prs.length > 0 ? (
          <View style={styles.prWrap}>
            <View style={styles.prHeadingRow}>
              <TrophyIcon size={16} color={colors.primary} />
              <Text style={styles.prHeading}>{labels.newPrsLabel}</Text>
            </View>
            {prs.map((pr) => (
              <Text key={`${pr.name}-${pr.est}`} style={styles.prLine}>
                {pr.name} · e1RM {pr.est} kg
              </Text>
            ))}
          </View>
        ) : null}
        <View style={styles.badgesWrap}>
          {badgeIds.map((badgeId) => (
            <AchievementBadge key={badgeId} title={badgeId} unlocked />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          style={styles.button}
        >
          <Text style={styles.buttonLabel}>{labels.doneLabel}</Text>
        </Pressable>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center' },
  card: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  label: { ...typography.label, color: colors.primary },
  title: { ...typography.title, color: colors.text, textAlign: 'center' },
  time: { ...typography.display, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary },
  prWrap: { alignItems: 'center', gap: spacing.xs },
  prHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  prHeading: { ...typography.label, color: colors.primary, marginTop: spacing.sm },
  prLine: { ...typography.caption, color: colors.text },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { ...typography.bodyStrong, color: colors.base, textTransform: 'uppercase' },
});
