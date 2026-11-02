/**
 * CommunityRows — memoized forum + challenge row renderers for the
 * CommunityScreen lists. Extracted from `CommunityScreen.tsx` (250-line
 * budget).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { type ForumTopic } from '../../communityService';
import { colors, radius, spacing, shadows, typography } from '../../../../shared/theme/tokens';
import { ListCard } from '../../../../shared/components/ui/ListCard';
import { CountdownTimer } from '../../../../shared/components/ui/CountdownTimer';
import { ChatIcon, FireIcon, ChevronRightIcon } from '../../../../shared/components/icons';
import { texts } from '../../../../shared/i18n/texts';
export type Challenge = {
  id: string;
  title: string;
  exercise_type: string;
  end_date: string;
  scoring_type: string;
  status: string;
  difficulty_level?: string;
};

export function getScoreTypeLabel(scoringType: string): string {
  switch (scoringType) {
    case 'form_score': return texts.challenge.formScore;
    case 'total_volume': return texts.challenge.totalVolume;
    case 'consistency': return texts.challenge.consistency;
    default: return scoringType;
  }
}

export const ForumRow = React.memo(function ForumRow({
  topic,
  last,
  onPress,
}: {
  topic: ForumTopic;
  last: boolean;
  onPress: () => void;
}) {
  return (
    <ListCard
      title={topic.title}
      subtitle={topic.description}
      leadingIcon={<ChatIcon size={20} color={colors.textSecondary} />}
      onPress={onPress}
      last={last}
    />
  );
});

export const ChallengeRow = React.memo(function ChallengeRow({ challenge }: { challenge: Challenge }) {
  return (
    <View style={styles.challengeCard}>
      <View style={styles.challengeHeader}>
        <View style={styles.challengeIcon}>
          <FireIcon size={18} color={colors.primary} />
        </View>
        <View style={styles.challengeInfo}>
          <Text style={styles.challengeTitle} numberOfLines={1}>
            {challenge.title}
          </Text>
          <View style={styles.challengeMeta}>
            <Text style={styles.challengeType}>{challenge.exercise_type}</Text>
            <Text style={styles.challengeDot}>·</Text>
            <Text style={styles.challengeScore}>{getScoreTypeLabel(challenge.scoring_type)}</Text>
          </View>
        </View>
        <CountdownTimer endDate={challenge.end_date} size="sm" showLabel={false} />
        <ChevronRightIcon size={16} color={colors.textSecondary} />
      </View>
    </View>
  );
});


const styles = StyleSheet.create({
  challengeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  challengeIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },
  challengeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  challengeType: {
    ...typography.bodySmall,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  challengeDot: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  challengeScore: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
