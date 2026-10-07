/**
 * TodayScreen — athlete landing (balanced density).
 *
 * Layout: header → dominant ContinueWorkoutCard (the next workout IS the
 * action) → readiness hero (with loading fallback) → compact scoreboard →
 * sessions → PRs → challenge (active or available) → community & news feed
 * (open by default). Never reads empty while data loads.
 * All sections are presentational; only this screen owns queries + navigation.
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
import { colors, spacing } from '../../../../shared/theme/tokens';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { MetricCard } from '../../../../shared/components/ui/MetricCard';
import { SectionHeader } from '../../../../shared/components/ui/SectionHeader';
import { ChallengeHomeCard } from '../../../../shared/components/ui/ChallengeHomeCard';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.todayScreen;
import { ContinueWorkoutCard } from '../../../../shared/components/fitness/ContinueWorkoutCard';
import { useStreak, usePRs } from '../../../gamification/hooks';
import { listAlerts, type Alert } from '../../../alerts/alertService';
import { listMessages, type CommunityMessage } from '../../../community/communityService';
import { listBlogPosts, type BlogPost } from '../../../blog/blogService';
import { AthleteTodaySummary } from './AthleteTodaySummary';
import { TodayHeader } from './TodayHeader';
import { SessionsSection, NewsFeedSection, PRsSection, ChallengeSection } from './TodaySections';
import type { AthleteTabParamList } from '../../../../navigation/AthleteTabs';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type TodayData = {
  athlete: { id: string; name: string; sport: string };
  readiness: { sleep: number; hrv: number; recovery: number; score: number };
  todaySessions: Array<{ id: string; name: string; time: string; endTime: string; location: string; status: string }>;
  activeWorkouts: Array<{ id: string; contentName: string; modality: string; status: string; progress: number }>;
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

  // Fallback when no active challenge: surface available challenges the athlete can join.
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

  // Total minutes from active workouts (estimate from progress).
  const totalMinutes = activeWorkouts.reduce((sum, w) => sum + Math.round(w.progress * 0.6), 0);

  const rootNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const latestChatMessage = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
  const displayedArticles = blogPosts.slice(0, 2);
  const firstWorkout = activeWorkouts[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <TodayHeader
          firstName={firstName}
          onSearch={() => rootNav?.navigate('Search')}
          onNotifications={() => rootNav?.navigate('Notifications')}
          onProfile={() => navigation.navigate('Profile')}
        />

        {/* Training-first: the workout IS the action — first after the header */}
        {firstWorkout ? (
          <ContinueWorkoutCard
            name={firstWorkout.contentName}
            progress={firstWorkout.progress ?? 0}
            exerciseCount={1}
            durationMin={Math.round(firstWorkout.progress * 0.6)}
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

        {/* Compact scoreboard — side by side, always visible ground layer */}
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

        <SessionsSection sessions={todaySessions} />
        <PRsSection
          prs={prs}
          onPress={() => navigation.navigate('Progress')}
        />
        {challengeToShow ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader title={t.challengesTitle} action={{ label: t.challengesSeeAll, onPress: () => rootNav?.navigate('Community') }} />
            <ChallengeHomeCard challenge={challengeToShow} loading={challengeLoading} />
          </View>
        ) : (
          <ChallengeSection
            hasChallenge={false}
            onPressChallenges={() => rootNav?.navigate('Community')}
          />
        )}
        <NewsFeedSection
          latestMessage={latestChatMessage}
          posts={displayedArticles}
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
  content: { padding: spacing.lg, paddingBottom: 120, gap: spacing.lg },
  scoreboard: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm, marginHorizontal: -spacing.sm },
  scoreItem: { flexBasis: '50%', maxWidth: '50%', minWidth: 0, paddingHorizontal: spacing.sm },
});