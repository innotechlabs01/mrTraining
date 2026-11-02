import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography, shadows } from '../../theme/tokens';
import { FireIcon, ChevronRightIcon } from '../icons';
import { CountdownTimer } from './CountdownTimer';
import type { RootStackParamList } from '../../../navigation/Navigation';
import { texts } from '../../i18n/texts';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type ChallengeData = {
  id: string;
  title: string;
  exercise_type: string;
  end_date: string;
  scoring_type: string;
  status: string;
  difficulty_level?: string;
  max_attempts: number;
  attempt_count?: number;
};

type Props = {
  challenge: ChallengeData | null;
  loading?: boolean;
};

function getDaysRemaining(endDate: string): number {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function isLastDay(endDate: string): boolean {
  return getDaysRemaining(endDate) <= 1;
}

function getScoreTypeLabel(scoringType: string): string {
  switch (scoringType) {
    case 'form_score': return texts.challenge.formScore;
    case 'total_volume': return texts.challenge.totalVolume;
    case 'consistency': return texts.challenge.consistency;
    default: return scoringType;
  }
}

export function ChallengeHomeCard({ challenge, loading }: Props) {
  const navigation = useNavigation<Nav>();

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.skeleton} />
      </View>
    );
  }

  if (!challenge) {
    return null;
  }

  const lastDay = isLastDay(challenge.end_date);
  const attemptCount = challenge.attempt_count ?? 0;
  const canAttempt = attemptCount < challenge.max_attempts;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, lastDay && styles.urgent, pressed && styles.pressed]}
      onPress={() => navigation.navigate('ChallengeDetail', { challengeId: challenge.id })}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <FireIcon size={20} color={colors.primary} />
        </View>
        <Text style={styles.title} numberOfLines={1}>{challenge.title}</Text>
        <ChevronRightIcon size={16} color={colors.textSecondary} />
      </View>

      <View style={styles.meta}>
        <Text style={styles.exerciseType}>{challenge.exercise_type}</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.scoreType}>{getScoreTypeLabel(challenge.scoring_type)}</Text>
      </View>

      <View style={styles.footer}>
        <CountdownTimer endDate={challenge.end_date} size="sm" />
        <View style={styles.attemptsInfo}>
          <Text style={styles.attemptsText}>
            {texts.challenge.attempts}: {attemptCount}/{challenge.max_attempts}
          </Text>
          {canAttempt && (
            <View style={styles.attemptBadge}>
              <Text style={styles.attemptBadgeText}>
                {attemptCount === 0 ? texts.challenge.join : texts.challenge.submitAttempt}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    ...shadows.md,
  },
  urgent: {
    borderColor: colors.error,
    borderWidth: 1.5,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    ...typography.h4,
    color: colors.text,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  exerciseType: {
    ...typography.bodySmall,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dot: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  scoreType: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  attemptsInfo: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  attemptsText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  attemptBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  attemptBadgeText: {
    ...typography.caption,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  skeleton: {
    height: 140,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
  },
});
