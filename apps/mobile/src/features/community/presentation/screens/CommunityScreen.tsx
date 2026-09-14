import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { getCommunity } from '../../communityService';
import { useCoachFeedPosts } from '../../../gamification/hooks/useCoachFeed';
import { colors, spacing, radius, typography, shadows } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { SegmentedFilter } from '../../../../shared/components/ui/SegmentedFilter';
import { ListCard } from '../../../../shared/components/ui/ListCard';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { CountdownTimer } from '../../../../shared/components/ui/CountdownTimer';
import { ChatIcon, FireIcon, TrophyIcon, TrendUpIcon, ChevronRightIcon } from '../../../../shared/components/icons';
import { CoachFeed } from './CoachFeedScreen';
import { texts } from '../../../../shared/i18n/texts';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type Tab = 'forum' | 'challenges' | 'coach';
type Nav = NativeStackNavigationProp<RootStackParamList>;

type Challenge = {
  id: string;
  title: string;
  exercise_type: string;
  end_date: string;
  scoring_type: string;
  status: string;
  difficulty_level?: string;
};

function getScoreTypeLabel(scoringType: string): string {
  switch (scoringType) {
    case 'form_score': return texts.challenge.formScore;
    case 'total_volume': return texts.challenge.totalVolume;
    case 'consistency': return texts.challenge.consistency;
    default: return scoringType;
  }
}

export function CommunityScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('forum');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['community'],
    queryFn: getCommunity,
    staleTime: 60_000,
  });

  // Fetch challenges from Go API
  const { data: challengesData, isLoading: challengesLoading } = useQuery({
    queryKey: ['athlete-challenges-v2'],
    queryFn: async () => {
      const { data } = await apiClient.get('/athlete/challenges');
      return ((data as any)?.data ?? []) as Challenge[];
    },
    staleTime: 60_000,
  });

  const { data: coachFeedPosts, isLoading: coachFeedLoading } = useCoachFeedPosts();

  const forums = data?.forums ?? [];
  const challenges = challengesData ?? [];

  const feedItems = (coachFeedPosts ?? []).map((post) => ({
    id: post.id,
    coachName: post.coach_name,
    message: post.content,
    createdAt: post.created_at,
    type: 'announcement' as const,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Comunidad" onBack={() => navigation.goBack()} />

      <View style={styles.filterWrap}>
        <SegmentedFilter
          options={[
            { key: 'forum', label: 'Foro' },
            { key: 'challenges', label: 'Desafios' },
            { key: 'coach', label: 'Coach' },
          ]}
          value={tab}
          onChange={(key) => setTab(key as Tab)}
        />
      </View>

      {isLoading ? (
        <View style={styles.skeletonWrap}>
          <Skeleton.List rows={5} />
        </View>
      ) : tab === 'coach' ? (
        coachFeedLoading ? (
          <View style={styles.skeletonWrap}>
            <Skeleton.List rows={3} />
          </View>
        ) : (
          <View style={styles.listContent}>
            <CoachFeed items={feedItems} />
          </View>
        )
      ) : tab === 'forum' ? (
        forums.length === 0 ? (
          <EmptyState
            variant="empty"
            title="Sin foros disponibles"
            message="Todavia no hay foros disponibles."
            actionLabel="Reintentar"
            onAction={() => refetch()}
          />
        ) : (
          <View style={styles.listContent}>
            {forums.map((topic, i) => (
              <ListCard
                key={topic.id}
                title={topic.title}
                subtitle={topic.description}
                leadingIcon={<ChatIcon size={20} color={colors.textSecondary} />}
                onPress={() => navigation.navigate('DiscussionForum')}
                last={i === forums.length - 1}
              />
            ))}
          </View>
        )
      ) : challengesLoading ? (
        <View style={styles.skeletonWrap}>
          <Skeleton.List rows={3} />
        </View>
      ) : challenges.length === 0 ? (
        <EmptyState
          variant="empty"
          title={texts.challenge.activeEmpty}
          message="No hay desafios activos por ahora."
          actionLabel="Reintentar"
          onAction={() => refetch()}
        />
      ) : (
        <View style={styles.listContent}>
          {challenges.map((challenge) => (
            <View key={challenge.id} style={styles.challengeCard}>
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
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  filterWrap: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  skeletonWrap: { paddingHorizontal: spacing.md },
  listContent: { paddingHorizontal: spacing.md, gap: spacing.sm },
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
    backgroundColor: 'rgba(200, 255, 0, 0.1)',
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
