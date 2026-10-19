
/**
 * TodayScreen — athlete landing.
 *
 * Priorities:
 * 1. Continue today's workout.
 * 2. Review readiness, activity and streak.
 * 3. View sessions, personal records and challenges.
 * 4. Discover coaching articles and store products.
 * 5. Catch up with the community.
 *
 * Principles:
 * - API-backed data; no fabricated workout metrics.
 * - Explicit loading, error and empty states.
 * - Safe numeric values for UI metrics.
 * - Query-based data fetching and refresh.
 * - Existing navigation routes and design tokens.
 */

import React, {
  useCallback,
  useMemo,
} from 'react';

import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  useFocusEffect,
  useNavigation,
  type CompositeNavigationProp,
} from '@react-navigation/native';

import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useUser } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';

import { smartClient as apiClient } from '../../../../infrastructure/api/client';

import {
  colors,
  layout,
  spacing,
} from '../../../../shared/theme/tokens';

import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { MetricCard } from '../../../../shared/components/ui/MetricCard';
import { SectionHeader } from '../../../../shared/components/ui/SectionHeader';
import { ChallengeHomeCard } from '../../../../shared/components/ui/ChallengeHomeCard';

import { texts } from '../../../../shared/i18n/texts';

import { ContinueWorkoutCard } from '../../../../shared/components/fitness/ContinueWorkoutCard';

import { useStreak, usePRs } from '../../../gamification/hooks';

import {
  listAlerts,
  type Alert,
} from '../../../alerts/alertService';

import {
  listMessages,
  type CommunityMessage,
} from '../../../community/communityService';

import {
  listBlogPosts,
  type BlogPost,
} from '../../../blog/blogService';

import {
  listStore,
  type StoreProduct,
} from '../../../store/storeService';

import { useCart } from '../../../store/application/cartStore';

import { AthleteTodaySummary } from './AthleteTodaySummary';
import { MorningCheckinCard } from '../components/MorningCheckinCard';
import { TodayHeader } from './TodayHeader';

import {
  SessionsSection,
  NewsFeedSection,
  PRsSection,
  ChallengeSection,
} from './TodaySections';

import {
  LiveSessionsSection,
  ArticlesCarousel,
  StoreCarousel,
} from './TodayExtraSections';

import { showToast } from '../../../../shared/components/ui/Toast';

import type { AthleteTabParamList } from '../../../../navigation/AthleteTabs';
import type { RootStackParamList } from '../../../../navigation/Navigation';

const t = texts.screens.todayScreen;
const tStore = texts.screens.storeScreen;

const QUERY_STALE_TIME = 60 * 1000;
const STORE_STALE_TIME = 5 * 60 * 1000;

type TodaySession = {
  id: string;
  name: string;
  time: string;
  endTime: string;
  location: string;
  status: string;
};

type ActiveWorkout = {
  id: string;
  contentName: string;
  modality: string;
  status: string;
  progress: number;
  exerciseCount?: number;
  estimatedMinutes?: number;
};

type TodayData = {
  athlete: {
    id: string;
    name: string;
    sport: string;
  };
  readiness: {
    sleep: number;
    hrv: number;
    recovery: number;
    score: number;
  };
  todaySessions: TodaySession[];
  activeWorkouts: ActiveWorkout[];
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

/**
 * Keeps API-derived numeric values finite and within bounds.
 */
function safeNumber(
  value: number | undefined | null,
  fallback = 0,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return value;
}

function clampProgress(value: number | undefined | null): number {
  return Math.min(1, Math.max(0, safeNumber(value)));
}

/**
 * Time-aware greeting using the device's local time.
 */
function timeGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return t.greetingMorning;
  if (hour < 19) return t.greetingAfternoon;

  return t.greetingEvening;
}

export function TodayScreen() {
  const navigation = useNavigation<TodayNav>();
  const { user } = useUser();

  const firstName = user?.firstName || t.athleteFallback;

  /**
   * Today's training data.
   *
   * The API remains the source of truth for sessions,
   * active workouts and readiness.
   */
  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['athlete-today'],
    queryFn: async (): Promise<TodayData> => {
      const response = await apiClient.get('/athlete/today');

      return response.data as TodayData;
    },
    staleTime: QUERY_STALE_TIME,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  /**
   * Gamification.
   */
  const { data: streakData } = useStreak();
  const { data: prsData } = usePRs();

  const streak = Math.max(
    0,
    safeNumber(streakData?.current),
  );

  const prs = prsData ?? [];

  /**
   * Community preview.
   */
  const { data: chatMessages = [] } = useQuery({
    queryKey: ['community-messages-preview'],
    queryFn: async (): Promise<CommunityMessage[]> => {
      try {
        return await listMessages();
      } catch {
        return [];
      }
    },
    staleTime: QUERY_STALE_TIME,
  });

  /**
   * Coach articles.
   */
  const { data: blogPosts = [] } = useQuery({
    queryKey: ['blog-preview'],
    queryFn: async (): Promise<BlogPost[]> => {
      try {
        return await listBlogPosts();
      } catch {
        return [];
      }
    },
    staleTime: QUERY_STALE_TIME,
  });

  /**
   * Alerts.
   *
   * Query caching avoids maintaining duplicate local state.
   */
  const {
    data: alerts = [],
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ['athlete-alerts'],
    queryFn: async (): Promise<Alert[]> => {
      try {
        return await listAlerts();
      } catch {
        return [];
      }
    },
    staleTime: QUERY_STALE_TIME,
  });

  /**
   * Active challenge.
   */
  const {
    data: activeChallenge,
    isLoading: challengeLoading,
  } = useQuery({
    queryKey: ['active-challenge-today'],
    queryFn: async (): Promise<ActiveChallenge | null> => {
      const response = await apiClient.get(
        '/athlete/challenges/active',
      );

      const payload = response.data as {
        data?: ActiveChallenge | null;
      };

      return payload?.data ?? null;
    },
    staleTime: QUERY_STALE_TIME,
  });

  /**
   * Available challenges are requested only when no active
   * challenge is available.
   */
  const {
    data: availableChallenges = [],
  } = useQuery({
    queryKey: ['available-challenges-today'],
    queryFn: async (): Promise<ActiveChallenge[]> => {
      const response = await apiClient.get(
        '/athlete/challenges',
      );

      const payload = response.data as {
        data?: ActiveChallenge[];
      };

      return payload?.data ?? [];
    },
    staleTime: QUERY_STALE_TIME,
    enabled:
      !challengeLoading &&
      activeChallenge == null,
  });

  const challengeToShow = activeChallenge ?? availableChallenges[0];

  /**
   * Store products.
   */
  const { data: storeProducts = [] } = useQuery({
    queryKey: ['athlete-store-preview'],
    queryFn: async (): Promise<StoreProduct[]> => {
      try {
        return await listStore();
      } catch {
        return [];
      }
    },
    staleTime: STORE_STALE_TIME,
  });

  const addToCart = useCart((state) => state.add);

  const handleAddProduct = useCallback(
    (product: StoreProduct) => {
      addToCart(product);

      showToast(
        'success',
        tStore.successTitle,
        tStore.addedBody,
      );
    },
    [addToCart],
  );

  /**
   * Refresh essential dashboard data when the screen regains focus.
   */
  useFocusEffect(
    useCallback(() => {
      void refetch();
      void refetchAlerts();
    }, [refetch, refetchAlerts]),
  );

  /**
   * Resolve the parent navigator once per render.
   */
  const rootNav =
    navigation.getParent<
      NativeStackNavigationProp<RootStackParamList>
    >();

  /**
   * Dashboard view models.
   */
  const todaySessions = data?.todaySessions ?? [];
  const activeWorkouts = data?.activeWorkouts ?? [];

  const firstWorkout = activeWorkouts[0] ?? null;

  const totalMinutes = useMemo(
    () =>
      activeWorkouts.reduce(
        (total, workout) =>
          total +
          Math.max(0, safeNumber(workout.estimatedMinutes)),
        0,
      ),
    [activeWorkouts],
  );

  /**
   * Activity indicators are derived from actual API data.
   * These represent dashboard activity, not medical assessments.
   */
  const moveProgress = data
    ? clampProgress(todaySessions.length / 3)
    : 0;

  const exerciseProgress = data
    ? clampProgress(activeWorkouts.length / 2)
    : 0;

  const recoveryProgress = data
    ? clampProgress(
        safeNumber(data.readiness?.recovery) / 100,
      )
    : 0;

  const latestChatMessage =
    chatMessages.length > 0
      ? chatMessages[chatMessages.length - 1]
      : null;

  /**
   * Navigation actions.
   */
  const handleSearch = useCallback(() => {
    rootNav?.navigate('Search');
  }, [rootNav]);

  const handleNotifications = useCallback(() => {
    rootNav?.navigate('Notifications');
  }, [rootNav]);

  const handleProfile = useCallback(() => {
    navigation.navigate('Profile');
  }, [navigation]);

  const handleOpenWorkout = useCallback(() => {
    if (!firstWorkout) return;

    rootNav?.navigate('WorkoutDetail', {
      workoutId: firstWorkout.id,
    });
  }, [firstWorkout, rootNav]);

  const handleJoinLive = useCallback(
    (id: string) => {
      rootNav?.navigate('EventDetail', {
        eventId: id,
      });
    },
    [rootNav],
  );

  const handleOpenArticle = useCallback(
    (id: string) => {
      rootNav?.navigate('ArticleDetail', { id });
    },
    [rootNav],
  );

  const handleOpenCommunity = useCallback(() => {
    rootNav?.navigate('Community');
  }, [rootNav]);

  const handleOpenArticles = useCallback(() => {
    rootNav?.navigate('Articles');
  }, [rootNav]);

  const handleOpenStore = useCallback(() => {
    rootNav?.navigate('Store');
  }, [rootNav]);

  const handleOpenDiscussion = useCallback(() => {
    rootNav?.navigate('DiscussionForum');
  }, [rootNav]);

  const handleOpenProgress = useCallback(() => {
    navigation.navigate('Progress');
  }, [navigation]);

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. Greeting and quick actions */}
        <TodayHeader
          firstName={firstName}
          greeting={timeGreeting()}
          onSearch={handleSearch}
          onNotifications={handleNotifications}
          onProfile={handleProfile}
        />

        {/* 2. Primary action: continue training */}
        {firstWorkout ? (
          <ContinueWorkoutCard
            name={firstWorkout.contentName}
            progress={clampProgress(firstWorkout.progress)}
            exerciseCount={Math.max(
              0,
              safeNumber(firstWorkout.exerciseCount),
            )}
            durationMin={Math.max(
              0,
              safeNumber(firstWorkout.estimatedMinutes),
            )}
            onPress={handleOpenWorkout}
          />
        ) : null}

        {/* 3. Readiness, activity and streak */}
        <View style={styles.checkinWrap}>
          <MorningCheckinCard />
        </View>
        <AthleteTodaySummary
          athleteId={user?.id ?? ''}
          move={moveProgress}
          exercise={exerciseProgress}
          recovery={recoveryProgress}
          streak={streak}
          streakInactive={streak === 0}
        />

        {/* 4. Compact activity scoreboard */}
        <View
          style={styles.scoreboard}
          accessibilityLabel="Resumen de actividad"
        >
          <View style={styles.scoreItem}>
            <MetricCard
              label={t.metricSessions}
              value={todaySessions.length}
              size="lg"
            />
          </View>

          <View style={styles.scoreItem}>
            <MetricCard
              label={t.metricMinutes}
              value={totalMinutes}
              unit={t.minutesUnit}
              size="lg"
            />
          </View>

          <View style={styles.scoreItem}>
            <MetricCard
              label={t.metricActive}
              value={activeWorkouts.length}
              size="lg"
            />
          </View>

          <View style={styles.scoreItem}>
            <MetricCard
              label={t.metricStreak}
              value={streak}
              unit={t.streakUnit}
              tone={streak > 0 ? 'success' : 'text'}
              size="lg"
            />
          </View>
        </View>

        {/* 5. Dashboard loading and failure states */}
        {isLoading && !data ? (
          <EmptyState variant="loading" />
        ) : null}

        {isError && !data ? (
          <View style={styles.errorContainer}>
            <EmptyState
              variant="empty"
              message={t.todayEmpty}
            />
          </View>
        ) : null}

        {!isLoading && !isError && !data ? (
          <EmptyState
            variant="empty"
            message={t.todayEmpty}
          />
        ) : null}

        {/* 6. Live sessions */}
        <LiveSessionsSection
          sessions={todaySessions as any}
          onJoin={handleJoinLive}
        />

        {/* 7. Scheduled sessions */}
        <SessionsSection sessions={todaySessions} />

        {/* 8. Personal records */}
        <PRsSection
          prs={prs}
          onPress={handleOpenProgress}
        />

        {/* 9. Challenges */}
        {challengeToShow ? (
          <View style={styles.section}>
            <SectionHeader
              title={t.challengesTitle}
              action={{
                label: t.challengesSeeAll,
                onPress: handleOpenCommunity,
              }}
            />

            <ChallengeHomeCard
              challenge={challengeToShow}
              loading={challengeLoading}
            />
          </View>
        ) : (
          <ChallengeSection
            hasChallenge={false}
            onPressChallenges={handleOpenCommunity}
          />
        )}

        {/* 10. Coaching articles */}
        <ArticlesCarousel
          posts={blogPosts.slice(0, 6)}
          onOpen={handleOpenArticle}
          onSeeAll={handleOpenArticles}
        />

        {/* 11. Store */}
        <StoreCarousel
          products={storeProducts}
          onAdd={handleAddProduct}
          onSeeAll={handleOpenStore}
        />

        {/* 12. Community and notifications */}
        <NewsFeedSection
          latestMessage={latestChatMessage}
          posts={[]}
          alerts={alerts}
          onPressCommunity={handleOpenDiscussion}
          onPressArticles={handleOpenArticles}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  checkinWrap: { marginBottom: spacing.sm },
  container: {
    flex: 1,
    backgroundColor: colors.base,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingHorizontal: layout.pagePadding,
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: spacing.xl,
  },

  scoreboard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
    rowGap: spacing.md,
  },

  scoreItem: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '45%',
    minWidth: 0,
  },

  section: {
    gap: spacing.md,
  },

  errorContainer: {
    gap: spacing.sm,
  },
});
