
import { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useFocusEffect,
  type CompositeNavigationProp,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import {
  colors,
  layout,
  spacing,
  typography,
  radius,
} from '../../../../shared/theme/tokens';
import { ActivityRings } from '../../../../shared/components/fitness/ActivityRings';
import { StatCard } from '../../../../shared/components/ui/StatCard';
import { Card } from '../../../../shared/components/ui/Card';
import { Badge } from '../../../../shared/components/ui/Badge';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { ProgressBar } from '../../../../shared/components/ui/ProgressBar';
import { SectionHeader } from '../../../../shared/components/ui/SectionHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import {
  PlayIcon,
  BarbellIcon,
  CalendarIcon,
} from '../../../../shared/components/icons';
import type { AthleteTabParamList } from '../../../../navigation/AthleteTabs';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { nextOccurrence, toISODate } from '../../application/planSchedule';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.historyScreen;
const tUp = texts.screens.planInfoSections;
const tHist = texts.screens.planHistorySections;

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<AthleteTabParamList, 'History'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Workout = {
  id: string;
  contentName: string;
  contentType: string;
  modality: string;
  startDate: string;
  endDate?: string;
  status: string;
  progress: number;
  daysOfWeek?: number[];
};

type TrainingSession = {
  id: string;
  title: string;
  scheduledAt: string;
  endAt?: string;
  location?: string;
  status: string;
};

type ProgressSummary = {
  workoutsCompleted: number;
  totalVolume: number;
  avgCompletionRate: number;
  streak: number;
};

const DAYS_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

type BadgeTone = 'primary' | 'success' | 'warning' | 'error' | 'neutral';

function toneForStatus(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'active') return 'success';
  if (s === 'pending' || s === 'scheduled') return 'warning';
  return 'neutral';
}

export function HistoryScreen() {
  const navigation = useNavigation<Nav>();

  const tomorrowStr = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return toISODate(t);
  }, []);

  const todayStr = useMemo(() => toISODate(new Date()), []);

  const {
    data: workouts,
    isLoading: workoutsLoading,
    refetch: refetchWorkouts,
    isRefetching,
  } = useQuery({
    queryKey: ['athlete-workouts'],
    queryFn: async (): Promise<Workout[]> => {
      const res = await apiClient.get('/athlete/workouts');
      const raw = Array.isArray(res.data)
        ? res.data
        : res.data?.data ?? res.data?.workouts ?? [];

      return (Array.isArray(raw) ? (raw as Workout[]) : []) as Workout[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: sessions,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ['upcoming-sessions'],
    queryFn: async () => {
      const res = await apiClient.get('/athlete/sessions');
      const raw = Array.isArray(res.data)
        ? res.data
        : res.data?.data ?? res.data?.sessions ?? [];

      const list: TrainingSession[] = Array.isArray(raw)
        ? (raw as TrainingSession[])
        : [];

      const now = new Date();

      return list
        .filter((s) => new Date(s.scheduledAt) >= now)
        .sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() -
            new Date(b.scheduledAt).getTime(),
        );
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: summary,
    isLoading: progressLoading,
    refetch: refetchProgress,
  } = useQuery({
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

  useFocusEffect(
    useCallback(() => {
      refetchWorkouts();
      refetchSessions();
      refetchProgress();
    }, [refetchWorkouts, refetchSessions, refetchProgress]),
  );

  // --- Derived data ---
  const planInfo = useMemo(() => {
    const list = workouts ?? [];

    const openPlans = list.filter(
      (w) =>
        w.status !== 'completed' &&
        (!w.endDate || w.endDate.slice(0, 10) >= todayStr),
    );

    const days = new Set<number>();

    openPlans.forEach((w) =>
      (w.daysOfWeek ?? []).forEach((d) => days.add(d)),
    );

    return {
      assigned: list.length,
      completed: list.filter((w) => w.status === 'completed').length,
      days: [...days].sort((a, b) => a - b),
    };
  }, [workouts, todayStr]);

  const nextWorkout = useMemo(() => {
    return (
      (workouts ?? [])
        .filter((w) => w.status !== 'completed')
        .map((w) => ({ ...w, nextDate: nextOccurrence(w, tomorrowStr) }))
        .filter(
          (w): w is Workout & { nextDate: string } =>
            w.nextDate !== null,
        )
        .sort((a, b) => a.nextDate.localeCompare(b.nextDate))[0] ?? null
    );
  }, [workouts, tomorrowStr]);

  const upcomingWorkoutItems: {
    id: string;
    contentName: string;
    status: string;
    nextDate: string;
  }[] = useMemo(() => {
    return (workouts ?? [])
      .filter((w) => w.status !== 'completed')
      .map((w) => ({
        id: w.id,
        contentName: w.contentName,
        status: w.status,
        nextDate: nextOccurrence(w, tomorrowStr),
      }))
      .filter(
        (
          item,
        ): item is {
          id: string;
          contentName: string;
          status: string;
          nextDate: string;
        } => item.nextDate !== null,
      )
      .sort((a, b) => a.nextDate.localeCompare(b.nextDate))
      .slice(0, 5);
  }, [workouts, tomorrowStr]);

  const historyDesc = useMemo(() => {
    return [...(workouts ?? [])].sort((a, b) =>
      b.startDate.localeCompare(a.startDate),
    );
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

  const planEmpty =
    !workoutsLoading &&
    ((workouts as Workout[] | undefined)?.length ?? 0) === 0;

  const showLoading =
    workoutsLoading &&
    ((workouts as Workout[] | undefined)?.length ?? 0) === 0;

  // Fitness rings data (0-1 scale)
  const sessionsGoal = 5;
  const sessionsDone = summary?.workoutsCompleted ?? 0;
  const volumeGoal = 1000;
  const volumeDone = summary?.totalVolume ?? 0;
  const completionRate = (summary?.avgCompletionRate ?? 0) / 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.eyebrow}>{t.eyebrow}</Text>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>
            {t.progressTitle}
          </Text>
          <Pressable
            style={styles.runCta}
            onPress={() => navigation.navigate('RunRecording')}
          >
            <Text style={styles.runCtaText}>Grabar carrera con GPS</Text>
          </Pressable>
        </View>

        {showLoading ? (
          <Skeleton.List rows={5} height={120} />
        ) : planEmpty ? (
          <EmptyState variant="empty" message={t.noPlanYet} />
        ) : (
          <>
            {/* --- HERO: Activity Rings + StatCards --- */}
            <View style={styles.heroSection}>
              <SectionHeader title={t.progressTitle} />

              <Card style={styles.ringsCard}>
                <View style={styles.ringsRow}>
                  <ActivityRings
                    move={Math.min(1, sessionsDone / sessionsGoal)}
                    exercise={Math.min(1, volumeDone / volumeGoal)}
                    recovery={Math.min(1, completionRate)}
                    size={160}
                  />

                  <View style={styles.ringsLegend}>
                    <RingLabel
                      color={colors.primary}
                      value={`${sessionsDone}/${sessionsGoal}`}
                      label={tUp.completedLabel}
                    />
                    <RingLabel
                      color={colors.success}
                      value={`${Math.round(volumeDone)}${t.volumeUnit}`}
                      label={tHist.totalVolume}
                    />
                    <RingLabel
                      color={colors.warning}
                      value={`${Math.round(completionRate * 100)}%`}
                      label={tHist.avgCompleted}
                    />
                  </View>
                </View>
              </Card>

              <View style={styles.statGrid}>
                <View style={styles.statCell}>
                  <StatCard
                    label={t.streakLabel}
                    value={summary?.streak ?? 0}
                    unit={t.streakUnit}
                    loading={progressLoading}
                  />
                </View>

                <View style={styles.statCell}>
                  <StatCard
                    label={t.volumeLabel}
                    value={Math.round(volumeDone)}
                    unit={t.volumeUnit}
                    loading={progressLoading}
                  />
                </View>
              </View>
            </View>

            {/* --- TU PLAN --- */}
            <View style={styles.section}>
              <SectionHeader title={t.yourPlan} />

              <Card style={styles.planCard}>
                <View style={styles.planProgressRow}>
                  <Text style={styles.planProgressText}>
                    {planInfo.completed} / {planInfo.assigned}
                  </Text>
                  <Text style={styles.planProgressLabel}>
                    {tUp.completedLabel}
                  </Text>
                </View>

                <ProgressBar
                  progress={
                    planInfo.assigned > 0
                      ? planInfo.completed / planInfo.assigned
                      : 0
                  }
                />

                {planInfo.days.length > 0 && (
                  <View style={styles.dayDotsRow}>
                    {planInfo.days.map((d) => (
                      <View key={d} style={styles.dayDot}>
                        <Text style={styles.dayDotText}>
                          {DAYS_LABELS[d]}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </View>

            {/* --- PRÓXIMO ENTRENAMIENTO --- */}
            {nextWorkout && (
              <View style={styles.section}>
                <SectionHeader title={t.nextWorkoutTitle} />

                <Pressable
                  onPress={() => onOpenWorkout(nextWorkout.id)}
                  style={({ pressed }) => [
                    styles.pressableCard,
                    pressed && styles.pressed,
                  ]}
                >
                  <Card style={styles.nextCard}>
                    <View style={styles.nextTopRow}>
                      <View style={styles.nextDateBadge}>
                        <Text style={styles.nextDateDay}>
                          {new Date(nextWorkout.nextDate ?? '').getDate()}
                        </Text>
                        <Text style={styles.nextDateMonth}>
                          {MONTHS[
                            new Date(nextWorkout.nextDate ?? '').getMonth()
                          ]}
                        </Text>
                      </View>

                      <View style={styles.nextBody}>
                        <Text style={styles.nextOverline}>
                          {t.nextWorkoutTitle}
                        </Text>
                        <Text style={styles.nextName} numberOfLines={2}>
                          {nextWorkout.contentName}
                        </Text>
                        <View style={styles.statusBadge}>
                          <Badge
                            text={nextWorkout.status}
                            tone={toneForStatus(nextWorkout.status)}
                          />
                        </View>
                      </View>

                      <View style={styles.playIconWrap}>
                        <PlayIcon size={22} color={colors.primary} />
                      </View>
                    </View>

                    <View style={styles.nextButton}>
                      <PrimaryButton
                        label={t.startCta}
                        onPress={() => onOpenWorkout(nextWorkout.id)}
                      />
                    </View>
                  </Card>
                </Pressable>
              </View>
            )}

            {/* --- PRÓXIMOS ENTRENAMIENTOS --- */}
            {upcomingWorkoutItems.length > 1 && (
              <View style={styles.section}>
                <SectionHeader title={tUp.upcomingTitle} />

                <View style={styles.cardList}>
                  {upcomingWorkoutItems.slice(1).map((w) => (
                    <Pressable
                      key={w.id}
                      onPress={() => onOpenWorkout(w.id)}
                      style={({ pressed }) => [
                        styles.pressableCard,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Card style={styles.listCard}>
                        <View style={styles.listTopRow}>
                          <View style={styles.listIconWrap}>
                            <BarbellIcon
                              size={19}
                              color={colors.primary}
                            />
                          </View>

                          <View style={styles.listBody}>
                            <Text
                              style={styles.listName}
                              numberOfLines={2}
                            >
                              {w.contentName}
                            </Text>
                            <Text style={styles.listMeta}>
                              {formatDayLabel(w.nextDate, tomorrowStr)}
                            </Text>
                          </View>

                          <View style={styles.listBadge}>
                            <Badge
                              text={w.status}
                              tone={toneForStatus(w.status)}
                            />
                          </View>
                        </View>
                      </Card>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* --- SESIONES --- */}
            {(sessions ?? []).length > 0 && (
              <View style={styles.section}>
                <SectionHeader title={tUp.sessionsTitle} />

                <View style={styles.cardList}>
                  {(sessions ?? []).slice(0, 3).map((s) => (
                    <Card key={s.id} style={styles.listCard}>
                      <View style={styles.listTopRow}>
                        <View style={styles.listIconWrap}>
                          <CalendarIcon
                            size={19}
                            color={colors.primary}
                          />
                        </View>

                        <View style={styles.listBody}>
                          <Text
                            style={styles.listName}
                            numberOfLines={2}
                          >
                            {s.title}
                          </Text>
                          <Text style={styles.listMeta}>
                            {formatSessionDate(s.scheduledAt)}
                            {s.location ? ` · ${s.location}` : ''}
                          </Text>
                        </View>

                        <View style={styles.listBadge}>
                          <Badge
                            text={s.status}
                            tone={toneForStatus(s.status)}
                          />
                        </View>
                      </View>
                    </Card>
                  ))}
                </View>
              </View>
            )}

            {/* --- HISTORIAL --- */}
            <View style={styles.section}>
              <SectionHeader title={tHist.historyTitle} />

              <View style={styles.cardList}>
                {historyDesc.slice(0, 10).map((w) => (
                  <Pressable
                    key={w.id}
                    onPress={() => onOpenWorkout(w.id)}
                    style={({ pressed }) => [
                      styles.pressableCard,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Card style={styles.listCard}>
                      <View style={styles.listTopRow}>
                        <View
                          style={[
                            styles.progressRing,
                            { borderColor: toneForProgress(w.progress) },
                          ]}
                        >
                          <Text style={styles.progressRingText}>
                            {Math.round(w.progress * 100)}
                          </Text>
                        </View>

                        <View style={styles.listBody}>
                          <Text
                            style={styles.listName}
                            numberOfLines={2}
                          >
                            {w.contentName}
                          </Text>
                          <Text style={styles.listMeta}>
                            {formatDayLabel(w.startDate, tomorrowStr)}
                            {' · '}
                            {w.modality || '—'}
                          </Text>
                        </View>

                        <View style={styles.listBadge}>
                          <Badge
                            text={w.status}
                            tone={toneForStatus(w.status)}
                          />
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Sub-components ---

function RingLabel({
  color,
  value,
  label,
}: {
  color: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.ringLabelRow}>
      <View style={[styles.ringLabelDot, { backgroundColor: color }]} />
      <View style={styles.ringLabelContent}>
        <Text style={styles.ringLabelValue}>{value}</Text>
        <Text style={styles.ringLabelText}>{label}</Text>
      </View>
    </View>
  );
}

function formatDayLabel(
  startDate: string,
  tomorrowStr: string,
): string {
  const datePart = startDate.slice(0, 10);

  if (datePart === tomorrowStr) return tUp.tomorrow;

  const [y, m, d] = datePart.split('-').map(Number);
  const dt = new Date(y, m - 1, d);

  return `${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
}

function formatSessionDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');

    return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${hh}:${mm}`;
  } catch {
    return dateStr;
  }
}

function toneForProgress(progress: number): string {
  if (progress >= 0.8) return colors.success;
  if (progress >= 0.4) return colors.warning;
  return colors.error;
}

const styles = StyleSheet.create({
  // Screen
  container: {
    flex: 1,
    backgroundColor: colors.base,
  },
  content: {
    paddingHorizontal: layout.pagePadding,
    paddingTop: spacing.lg,
    paddingBottom: 112,
  },
  runCta: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  runCtaText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  pageHeader: {
    marginBottom: spacing.xxl ?? spacing.lg * 3,
  },
  eyebrow: {
    ...typography.label,
    color: colors.primary,
    marginBottom: spacing.sm,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.xxl ?? spacing.lg * 3,
  },
  pressableCard: {
    borderRadius: radius.xl,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },

  // Activity rings
  heroSection: {
    gap: spacing.lg,
    marginBottom: spacing.xxl ?? spacing.lg * 3,
  },
  ringsCard: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    borderRadius: radius.xl,
  },
  ringsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  ringsLegend: {
    flex: 1,
    gap: spacing.lg,
    minWidth: 0,
  },
  ringLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  ringLabelContent: {
    flex: 1,
    minWidth: 0,
  },
  ringLabelDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  ringLabelValue: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 16,
    marginBottom: 2,
  },
  ringLabelText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  // Statistics
  statGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  statCell: {
    flex: 1,
    minWidth: 0,
  },

  // Plan
  planCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
  },
  planProgressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  planProgressText: {
    ...typography.h2,
    color: colors.primary,
  },
  planProgressLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dayDotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  dayDot: {
    minWidth: 42,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}18`,
  },
  dayDotText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },

  // Next workout
  nextCard: {
    padding: spacing.lg,
    gap: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: `${colors.primary}45`,
  },
  nextTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  nextDateBadge: {
    width: 62,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    paddingVertical: spacing.sm,
  },
  nextDateDay: {
    ...typography.h2,
    color: colors.primary,
    lineHeight: 32,
  },
  nextDateMonth: {
    ...typography.caption,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  nextBody: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  nextOverline: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  nextName: {
    ...typography.h3,
    color: colors.text,
    lineHeight: 26,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  playIconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}15`,
  },
  nextButton: {
    marginTop: spacing.xs,
  },

  // Upcoming sessions and workout history
  cardList: {
    gap: spacing.md,
  },
  listCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
  },
  listTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  listIconWrap: {
    width: 42,
    height: 42,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: `${colors.primary}12`,
  },
  listBody: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  listName: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  listMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  listBadge: {
    flexShrink: 0,
    alignItems: 'flex-end',
    maxWidth: 112,
  },

  // Workout completion indicator
  progressRing: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 22,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  progressRingText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
});
