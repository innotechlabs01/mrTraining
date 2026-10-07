import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { getCommunity } from '../../communityService';
import { useCoachFeedPosts } from '../../../gamification/hooks/useCoachFeed';
import { colors, spacing } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { SegmentedFilter } from '../../../../shared/components/ui/SegmentedFilter';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { CoachFeed } from './CoachFeedScreen';
import { ForumRow, ChallengeRow, type Challenge } from './CommunityRows';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.communityScreen;
import type { RootStackParamList } from '../../../../navigation/Navigation';

type Tab = 'forum' | 'challenges' | 'coach';
type Nav = NativeStackNavigationProp<RootStackParamList>;



function byId(item: { id: string }): string {
  return item.id;
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

  const { data: coachFeedPosts, isLoading: coachFeedLoading, isError: coachFeedError, refetch: refetchCoachFeed } = useCoachFeedPosts();

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
      <ScreenHeader title={t.title} onBack={() => navigation.goBack()} />

      <View style={styles.filterWrap}>
        <SegmentedFilter
          options={[
            { key: 'forum', label: t.tabForum },
            { key: 'challenges', label: t.tabChallenges },
            { key: 'coach', label: t.tabCoach },
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
        ) : coachFeedError ? (
          <EmptyState
            variant="error"
            title={texts.state.errorTitle}
            message={texts.state.errorMessage}
            onRetry={() => refetchCoachFeed()}
          />
        ) : (
          <View style={styles.feedWrap}>
            <CoachFeed items={feedItems} />
          </View>
        )
      ) : tab === 'forum' ? (
        forums.length === 0 ? (
          <EmptyState
            variant="empty"
            title={t.forumsEmptyTitle}
            message={t.forumsEmptyMessage}
            actionLabel={texts.common.retry}
            onAction={() => refetch()}
          />
        ) : (
          <FlashList
            data={forums}
            renderItem={({ item, index }) => (
              <ForumRow
                topic={item}
                last={index === forums.length - 1}
                onPress={() => navigation.navigate('DiscussionForum')}
              />
            )}
            keyExtractor={byId}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : challengesLoading ? (
        <View style={styles.skeletonWrap}>
          <Skeleton.List rows={3} />
        </View>
      ) : challenges.length === 0 ? (
        <EmptyState
          variant="empty"
          title={texts.challenge.activeEmpty}
          message={t.challengesEmpty}
          actionLabel={texts.common.retry}
          onAction={() => refetch()}
        />
      ) : (
        <FlashList
          data={challenges}
          renderItem={({ item }) => <ChallengeRow challenge={item} />}
          keyExtractor={byId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  filterWrap: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  skeletonWrap: { paddingHorizontal: spacing.md },
  feedWrap: { flex: 1, paddingHorizontal: spacing.md },
  listContent: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.md },
});
