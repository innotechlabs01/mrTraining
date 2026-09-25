import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, typography, fontFamilies } from '../../../../shared/theme/tokens';
import type { AthleteTabParamList } from '../../../../navigation/AthleteTabs';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import {
  PlanInfoCard,
  UpcomingWorkoutsSection,
  UpcomingSessionsSection,
  type Workout,
  type TrainingSession,
} from './PlanInfoSections';
import {
  WeeklySummarySection,
  HistorySection,
  type ProgressSummary,
} from './PlanHistorySections';
import { nextOccurrence, toISODate } from '../../application/planSchedule';

type HistoryNav = CompositeNavigationProp<
  BottomTabNavigationProp<AthleteTabParamList, 'Plan'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function HistoryScreen() {
  const navigation = useNavigation<HistoryNav>();
  const tomorrowStr = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return toISODate(t);
  }, []);
  const todayStr = useMemo(() => toISODate(new Date()), []);

  // All assigned workouts (past + future) — source for plan info, próximos, historial.
  const { data: workouts, isLoading: workoutsLoading, refetch: refetchWorkouts, isRefetching } = useQuery({
    queryKey: ['athlete-workouts'],
    queryFn: async () => {
      const res = await apiClient.get('/athlete/workouts');
      const raw = res.data?.data ?? res.data?.workouts ?? [];
      return (Array.isArray(raw) ? (raw as Workout[]) : []) as Workout[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Upcoming agenda sessions from the coach.
  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['upcoming-sessions'],
    queryFn: async () => {
      const res = await apiClient.get('/athlete/sessions');
      const raw = res.data?.data ?? res.data?.sessions ?? [];
      const list: TrainingSession[] = Array.isArray(raw) ? (raw as TrainingSession[]) : [];
      const now = new Date();
      const filtered = list.filter((s) => new Date(s.scheduledAt) >= now);
      filtered.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      return filtered;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Weekly progress summary (last 7 days including today) — server-side aggregate.
  const { data: summary, isLoading: progressLoading, refetch: refetchProgress } = useQuery({
    queryKey: ['weekly-progress'],
    queryFn: async () => {
      const today = new Date();
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      const res = await apiClient.get(
        `/athlete/progress/summary?start_date=${toISODate(start)}&end_date=${toISODate(today)}`,
      );
      return (res.data ?? {}) as ProgressSummary;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Refresh all three queries when the tab regains focus.
  useFocusEffect(
    useCallback(() => {
      refetchWorkouts();
      refetchSessions();
      refetchProgress();
    }, [refetchWorkouts, refetchSessions, refetchProgress]),
  );

  // Tu Plan: total asignados, completados, días de la semana (contract: 0=Dom..6=Sáb).
  const planInfo = useMemo(() => {
    const list = workouts ?? [];
    const openPlans = list.filter((w) => w.status !== 'completed' && (!w.endDate || w.endDate.slice(0, 10) >= todayStr));
    const days = new Set<number>();
    openPlans.forEach((w) => (w.daysOfWeek ?? []).forEach((d) => days.add(d)));
    return {
      assigned: list.length,
      completed: list.filter((w) => w.status === 'completed').length,
      days: [...days].sort((a, b) => a - b),
    };
  }, [workouts, todayStr]);

  // Próximos entrenamientos: próxima ocurrencia real de cada plan abierto, desde mañana.
  const upcomingWorkoutItems = useMemo(() => {
    return (workouts ?? [])
      .filter((w) => w.status !== 'completed')
      .map((w) => ({ id: w.id, contentName: w.contentName, status: w.status, nextDate: nextOccurrence(w, tomorrowStr) }))
      .filter((item): item is { id: string; contentName: string; status: string; nextDate: string } => item.nextDate !== null)
      .sort((a, b) => a.nextDate.localeCompare(b.nextDate))
      .slice(0, 5);
  }, [workouts, tomorrowStr]);

  // Historial: de hoy hacia atrás (orden DESC por fecha).
  const historyDesc = useMemo(() => {
    return [...(workouts ?? [])].sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [workouts]);

  const onOpenWorkout = useCallback(
    (id: string) => {
      navigation
        .getParent<NativeStackNavigationProp<RootStackParamList>>()
        ?.navigate('WorkoutDetail', { workoutId: id });
    },
    [navigation],
  );

  const onRefresh = useCallback(() => {
    refetchWorkouts();
    refetchSessions();
    refetchProgress();
  }, [refetchWorkouts, refetchSessions, refetchProgress]);

  const planEmpty = useMemo(() => !workoutsLoading && (workouts?.length ?? 0) === 0, [workoutsLoading, workouts]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={styles.eyebrow}>PLAN DE ENTRENAMIENTO</Text>
        <Text style={styles.title}>Plan</Text>

        {/* Tu Plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tu Plan</Text>
          <PlanInfoCard plan={planInfo} loading={workoutsLoading} onEmpty={planEmpty} />
        </View>

        <UpcomingWorkoutsSection
          items={upcomingWorkoutItems}
          loading={workoutsLoading}
          tomorrowStr={tomorrowStr}
          onOpen={onOpenWorkout}
        />

        <UpcomingSessionsSection items={sessions ?? []} loading={sessionsLoading} onOpen={onOpenWorkout} />

        <WeeklySummarySection loading={progressLoading} summary={summary} />

        <HistorySection loading={workoutsLoading} items={historyDesc} onOpen={onOpenWorkout} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: spacing.lg, paddingBottom: 100 },
  eyebrow: { ...typography.label, color: colors.primary, marginBottom: spacing.sm },
  title: { ...typography.title, color: colors.text, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
});