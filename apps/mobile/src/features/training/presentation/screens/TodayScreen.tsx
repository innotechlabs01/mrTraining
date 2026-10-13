/**
 * TodayScreen — athlete landing (balanced density, fitness-first).
 *
 * Layout: time-aware greeting → dominant ContinueWorkoutCard → readiness
 * rings + streak → compact scoreboard → LIVE sessions (if any) → sessions
 * → PRs → challenge → coach articles carousel → store carousel →
 * community feed. Training IS the action.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, layout, spacing } from '../../../../shared/theme/tokens';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { MetricCard } from '../../../../shared/components/ui/MetricCard';
import { SectionHeader } from '../../../../shared/components/ui/SectionHeader';
import { ChallengeHomeCard } from '../../../../shared/components/ui/ChallengeHomeCard';
import { texts } from '../../../../shared/i18n/texts';
import { ContinueWorkoutCard } from '../../../../shared/components/fitness/ContinueWorkoutCard';
import { useStreak, usePRs } from '../../../gamification/hooks';
import { listAlerts, type Alert } from '../../../alerts/alertService';
import { listMessages, type CommunityMessage } from '../../../community/communityService';
import { listBlogPosts, type BlogPost } from '../../../blog/blogService';
import { listStore, type StoreProduct } from '../../../store/storeService';
import { useCart } from '../../../store/application/cartStore';
import { AthleteTodaySummary } from './AthleteTodaySummary';
import { TodayHeader } from './TodayHeader';
import { SessionsSection, NewsFeedSection, PRsSection, ChallengeSection } from './TodaySections';
import { LiveSessionsSection, ArticlesCarousel, StoreCarousel } from './TodayExtraSections';
import { showToast } from '../../../../shared/components/ui/Toast';
import type { AthleteTabParamList } from '../../../../navigation/AthleteTabs';
import type { RootStackParamList } from '../../../../navigation/Navigation';

const t = texts.screens.todayScreen;
const tStore = texts.screens.storeScreen;

type TodayData = {
  athlete: { id: string; name: string; sport: string };
  readiness: { sleep: number; hrv: number; recovery: number; score: number };
  todaySessions: Array<{ id: string; name: string; time: string; endTime: string; location: string; status: string }>;
  activeWorkouts: Array<{ id: string; contentName: string; modality: string; status: string; progress: number; exerciseCount?: number; estimatedMinutes?: number }>;
};

type ActiveChallenge = {
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

type TodayNav = CompositeNavigationProp<
  BottomTabNavigationProp<AthleteTabParamList, 'Today'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return t.greetingMorning;
  if (h < 19) return t.greetingAfternoon;
  return t.greetingEvening;
}

export function TodayScreen() {
  const navigation = useNavigation<TodayNav>();
  const { user } = useUser();
  const firstName = user?.firstName || t.athleteFallback;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['athlete-today'],
    queryFn: async () => {
      const { data } = await apiClient.get('/athlete/today');
      return data as TodayData;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const { data: streakData } = useStreak();
  const streak = streakData?.current ?? 0;

  const { data: chatMessages = [] } = useQuery({
    queryKey: ['community-messages-preview'],
    queryFn: () => listMessages().catch((): CommunityMessage[] => []),
    staleTime: 60 * 1000,
  });

  const { data: blogPosts = [] } = useQuery({
    queryKey: ['blog-preview'],
    queryFn: () => listBlogPosts().catch((): BlogPost[] => []),
    staleTime: 60 * 1000,
  });

  const { data: activeChallenge, isLoading: challengeLoading } = useQuery({
    queryKey: ['active-challenge-today'],
    queryFn: async (): Promise<ActiveChallenge | null> => {
      const { data } = await apiClient.get('/athlete/challenges/active');
      return (data as { data?: ActiveChallenge | null })?.data ?? null;
    },
    staleTime: 60 * 1000,
  });

  const { data: availableChallenges = [] } = useQuery({
    queryKey: ['available-challenges-today'],
    queryFn: async (): Promise<Array<ActiveChallenge>> => {
      if (activeChallenge) return [];
      const { data } = await apiClient.get('/athlete/challenges');
      return (data as { data?: Array<ActiveChallenge> })?.data ?? [];
    },
    staleTime: 60 * 1000,
    enabled: !activeChallenge && !challengeLoading,
  });

  const { data: prsData } = usePRs();
  const prs = prsData ?? [];
  const challengeToShow = activeChallenge ?? availableChallenges[0];

  // Store products for the home carousel
  const { data: storeProducts = [] } = useQuery({
    queryKey: ['athlete-store-preview'],
    queryFn: () => listStore().catch((): StoreProduct[] => []),
    staleTime: 5 * 60 * 1000,
  });

  const addToCart = useCart((s) => s.add);
  const handleAddProduct = useCallback((product: StoreProduct) => {
    addToCart(product);
    showToast('success', tStore.successTitle, tStore.addedBody);
  }, [addToCart]);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  useEffect(() => {
    listAlerts().then(setAlerts).catch(() => setAlerts([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const hasData = !!data;
  const todaySessions = data?.todaySessions ?? [];
  const activeWorkouts = data?.activeWorkouts ?? [];

  // Rings derived from real data (0-1 scale).
  const moveProgress = data ? Math.min(1, todaySessions.length / 3) : 0;
  const exerciseProgress = data ? Math.min(1, activeWorkouts.length / 2) : 0;
  const recoveryProgress = data ? data.readiness.recovery / 100 : 0;

  const totalMinutes = activeWorkouts.reduce((sum, w) => sum + (w.estimatedMinutes ?? 0), 0);
  const rootNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const latestChatMessage = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
  const firstWorkout = activeWorkouts[0];

  const handleJoinLive = useCallback((id: string) => {
    rootNav?.navigate('EventDetail', { eventId: id });
  }, [rootNav]);

  const handleOpenArticle = useCallback((id: string) => {
    rootNav?.navigate('ArticleDetail', { id });
  }, [rootNav]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <TodayHeader
          firstName={firstName}
          greeting={timeGreeting()}
          onSearch={() => rootNav?.navigate('Search')}
          onNotifications={() => rootNav?.navigate('Notifications')}
          onProfile={() => navigation.navigate('Profile')}
        />

        {/* Training-first: the workout IS the action */}
        {firstWorkout ? (
          <ContinueWorkoutCard
            name={firstWorkout.contentName}
            progress={firstWorkout.progress ?? 0}
            exerciseCount={firstWorkout.exerciseCount ?? 0}
            durationMin={firstWorkout.estimatedMinutes ?? 0}
            onPress={() => rootNav?.navigate('WorkoutDetail', { workoutId: firstWorkout.id })}
          />
        ) : null}

        <AthleteTodaySummary
          athleteId={user?.id ?? ''}
          move={moveProgress}
          exercise={exerciseProgress}
          recovery={recoveryProgress}
          streak={streak}
          streakInactive={streak === 0}
        />

        {/* Compact scoreboard */}
        <View style={styles.scoreboard}>
          <View style={styles.scoreItem}>
            <MetricCard label={t.metricSessions} value={todaySessions.length} />
          </View>
          <View style={styles.scoreItem}>
            <MetricCard label={t.metricMinutes} value={totalMinutes} unit={t.minutesUnit} />
          </View>
          <View style={styles.scoreItem}>
            <MetricCard label={t.metricActive} value={activeWorkouts.length} />
          </View>
          <View style={styles.scoreItem}>
            <MetricCard label={t.metricStreak} value={streak} unit={t.streakUnit} tone={streak > 0 ? 'success' : 'text'} />
          </View>
        </View>

        {isLoading ? (
          <EmptyState variant="loading" />
        ) : !hasData ? (
          <EmptyState variant="empty" message={t.todayEmpty} />
        ) : null}

        {/* LIVE sessions — urgent red accent */}
        <LiveSessionsSection sessions={todaySessions} onJoin={handleJoinLive} />

        <SessionsSection sessions={todaySessions} />
        <PRsSection prs={prs} onPress={() => navigation.navigate('Progress')} />

        {challengeToShow ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader title={t.challengesTitle} action={{ label: t.challengesSeeAll, onPress: () => rootNav?.navigate('Community') }} />
            <ChallengeHomeCard challenge={challengeToShow} loading={challengeLoading} />
          </View>
        ) : (
          <ChallengeSection hasChallenge={false} onPressChallenges={() => rootNav?.navigate('Community')} />
        )}

        {/* Coach articles — promoted from accordion to dedicated carousel */}
        <ArticlesCarousel
          posts={blogPosts.slice(0, 6)}
          onOpen={handleOpenArticle}
          onSeeAll={() => rootNav?.navigate('Articles')}
        />

        {/* Store — featured products with add-to-cart */}
        <StoreCarousel
          products={storeProducts}
          onAdd={handleAddProduct}
          onSeeAll={() => rootNav?.navigate('Store')}
        />

        {/* Community — chat + alerts (simplified, articles moved up) */}
        <NewsFeedSection
          latestMessage={latestChatMessage}
          posts={[]}
          alerts={alerts}
          onPressCommunity={() => rootNav?.navigate('DiscussionForum')}
          onPressArticles={() => rootNav?.navigate('Articles')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: layout.pagePadding, paddingBottom: 120, gap: spacing.lg },
  scoreboard: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm, marginHorizontal: -spacing.sm },
  scoreItem: { flexBasis: '50%', maxWidth: '50%', minWidth: 0, paddingHorizontal: spacing.sm },
});
