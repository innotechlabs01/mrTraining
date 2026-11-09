/**
 * TodayScreen — athlete landing. Training-first.
 *
 * Priorities:
 * 1. Continue today's workout (primary action, top).
 * 2. Readiness snapshot (compact).
 * 3. Quick actions: continue / exercises / history / coach messages.
 *
 * Everything else (articles, store, news) moves below the fold or off-screen
 * so it never competes with the training intent.
 *
 * Principles:
 * - API-backed data; no fabricated workout metrics.
 * - Explicit loading, error and empty states.
 * - FlashList for scrollable lists (60 FPS).
 * - Fewer mount queries for fast first paint.
 */

import React, { useCallback, useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';

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

import { useStreak } from '../../../gamification/hooks';

import { smartClient as apiClient } from '../../../../infrastructure/api/client';

import {
  colors,
  layout,
  radius,
  spacing,
  typography,
} from '../../../../shared/theme/tokens';

import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { SectionHeader } from '../../../../shared/components/ui/SectionHeader';
import { ChallengeHomeCard } from '../../../../shared/components/ui/ChallengeHomeCard';
import { MetricCard } from '../../../../shared/components/ui/MetricCard';

import { texts } from '../../../../shared/i18n/texts';

import { ContinueWorkoutCard } from '../../../../shared/components/fitness/ContinueWorkoutCard';
import { AthleteTodaySummary } from './AthleteTodaySummary';
import { TodayHeader } from './TodayHeader';

import {
  SessionsSection,
  PRsSection,
} from './TodaySections';

import { showToast } from '../../../../shared/components/ui/Toast';

import type { AthleteTabParamList } from '../../../../navigation/AthleteTabs';
import type { RootStackParamList } from '../../../../navigation/Navigation';

const t = texts.screens.todayScreen;

const QUERY_STALE_TIME = 60 * 1000;

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

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return t.greetingMorning;
  if (hour < 19) return t.greetingAfternoon;
  return t.greetingEvening;
}

function QuickAction({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.quickItem}>
      <View style={styles.quickWrap}>
        {icon}
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </View>
  );
}

export function TodayScreen() {
  const navigation = useNavigation<TodayNav>();
  const { user } = useUser();

  const firstName = user?.firstName || t.athleteFallback;

  /**
   * Today's training data — single essential query for fast first paint.
   * Articles, store and news are not fetched here anymore.
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
   * Gamification (streak) — lightweight hook.
   */
  const { data: streakData } = useStreak();

  const streak = Math.max(0, safeNumber(streakData?.current));

  const todaySessions = data?.todaySessions ?? [];
  const activeWorkouts = data?.activeWorkouts ?? [];
  const firstWorkout = activeWorkouts[0] ?? null;

  const totalMinutes = useMemo(
    () =>
      activeWorkouts.reduce(
        (total, workout) =>
          total + Math.max(0, safeNumber(workout.estimatedMinutes)),
        0,
      ),
    [activeWorkouts],
  );

  const moveProgress = data
    ? clampProgress(todaySessions.length / 3)
    : 0;

  const exerciseProgress = data
    ? clampProgress(activeWorkouts.length / 2)
    : 0;

  const recoveryProgress = data
    ? clampProgress(safeNumber(data.readiness?.recovery) / 100)
    : 0;

  const rootNav =
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

  const handleOpenWorkout = useCallback(() => {
    if (!firstWorkout) return;
    rootNav?.navigate('WorkoutDetail', {
      workoutId: firstWorkout.id,
    });
  }, [firstWorkout, rootNav]);

  const handleOpenExercises = useCallback(() => {
    rootNav?.navigate('Search');
  }, [rootNav]);

  const handleOpenHistory = useCallback(() => {
    navigation.navigate('Progress');
  }, [navigation]);

  const handleOpenMessages = useCallback(() => {
    rootNav?.navigate('Notifications');
  }, [rootNav]);

  const renderSessionItem = useCallback(
    ({ item }: { item: TodaySession }) => (
      <View style={styles.sessionRow}>
        <Text style={styles.sessionTime}>{item.time}</Text>
        <View style={styles.sessionBody}>
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.sessionMeta}>
            {item.endTime}{item.location ? ` · ${item.location}` : ''}
          </Text>
        </View>
      </View>
    ),
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

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
          onSearch={handleOpenExercises}
          onNotifications={handleOpenMessages}
          onProfile={() => navigation.navigate('Profile')}
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

        {/* 3. Readiness compact */}
        <AthleteTodaySummary
          athleteId={user?.id ?? ''}
          move={moveProgress}
          exercise={exerciseProgress}
          recovery={recoveryProgress}
          streak={streak}
          streakInactive={streak === 0}
        />

        {/* 4. Quick actions row */}
        <View style={styles.quickActions}>
          <QuickAction
            label={t.quickContinue}
            onPress={handleOpenWorkout}
            icon={
              <View style={styles.quickIcon}>
                <View style={styles.quickIconBg} />
              </View>
            }
          />
          <QuickAction
            label={t.quickExercises}
            onPress={handleOpenExercises}
            icon={
              <View style={styles.quickIcon}>
                <View style={styles.quickIconBg} />
              </View>
            }
          />
          <QuickAction
            label={t.quickHistory}
            onPress={handleOpenHistory}
            icon={
              <View style={styles.quickIcon}>
                <View style={styles.quickIconBg} />
              </View>
            }
          />
          <QuickAction
            label={t.quickMessages}
            onPress={handleOpenMessages}
            icon={
              <View style={styles.quickIcon}>
                <View style={styles.quickIconBg} />
              </View>
            }
          />
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
          <EmptyState variant="empty" message={t.todayEmpty} />
        ) : null}

        {/* 6. Scheduled sessions (FlashList for smooth scroll) */}
        <View style={styles.section}>
          <SectionHeader title={t.sessionsTitle} />
          {todaySessions.length === 0 ? (
            <EmptyState
              variant="empty"
              message={texts.screens.todaySections.sessionsEmpty}
            />
          ) : (
            <FlashList<TodaySession>
              data={todaySessions}
              renderItem={renderSessionItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.flashContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* 7. PRs */}
        <PRsSection
          prs={[]}
          onPress={handleOpenHistory}
        />

        {/* 8. Active challenge (compact, below fold) — null hides the card */}
        <View style={styles.section}>
          <SectionHeader
            title={t.challengesTitle}
            action={{
              label: t.challengesSeeAll,
              onPress: () => rootNav?.navigate('Community'),
            }}
          />
          <ChallengeHomeCard challenge={null} loading={false} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  quickItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickIcon: {
    width: 24,
    height: 24,
  },
  quickIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  quickLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
  },
  section: {
    gap: spacing.md,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  sessionTime: {
    ...typography.caption,
    color: colors.textSecondary,
    width: 56,
  },
  sessionBody: {
    flex: 1,
    gap: 2,
  },
  sessionTitle: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 14,
  },
  sessionMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  flashContent: {
    paddingBottom: spacing.md,
  },
  errorContainer: {
    gap: spacing.sm,
  },
});
