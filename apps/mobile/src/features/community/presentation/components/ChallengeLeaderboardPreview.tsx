import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../../../../shared/theme/tokens';
import { SectionHeader } from '../../../../shared/components/ui/SectionHeader';
import { TrophyIcon } from '../../../../shared/components/icons';
import { texts } from '../../../../shared/i18n/texts';
import type { LeaderboardEntry } from './challengeTypes';

type Props = {
  entries: LeaderboardEntry[];
  onSeeAll: () => void;
};

/** Top-5 leaderboard preview; hidden by parent when empty. */
export function ChallengeLeaderboardPreview({ entries, onSeeAll }: Props) {
  return (
    <View style={styles.section}>
      <SectionHeader
        title={texts.challenge.leaderboard}
        icon={<TrophyIcon size={18} color={colors.primary} />}
        action={{ label: texts.common.seeAll, onPress: onSeeAll }}
      />
      {entries.slice(0, 5).map((entry) => (
        <View key={entry.athlete_id} style={styles.entry}>
          <View style={styles.position}>
            <Text style={[
              styles.positionText,
              entry.rank <= 3 && { color: colors.primary }
            ]}>
              {entry.rank}
            </Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {entry.athlete_name}
          </Text>
          <Text style={styles.score}>
            {entry.best_score.toFixed(1)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  position: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  name: {
    flex: 1,
    ...typography.body,
    color: colors.text,
  },
  score: {
    ...typography.metricSM,
    color: colors.primary,
  },
});
