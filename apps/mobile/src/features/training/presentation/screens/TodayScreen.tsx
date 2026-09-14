import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, typography, radius, fontFamilies } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { Badge } from '../../../../shared/components/ui/Badge';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { ChallengeHomeCard } from '../../../../shared/components/ui/ChallengeHomeCard';
import { BentoGrid, BentoItem } from '../../../../shared/components/ui/BentoGrid';
import { StatCard } from '../../../../shared/components/ui/StatCard';
import { ActivityRings } from '../../../../shared/components/fitness/ActivityRings';
import { WorkoutCard } from '../../../../shared/components/fitness/WorkoutCard';
import { StreakBadge } from '../../../../shared/components/gamification/StreakBadge';
import { AchievementBadge } from '../../../../shared/components/gamification/AchievementBadge';
import { useStreak } from '../../../../features/gamification/hooks';
import {
  SearchIcon, BellIcon, UserIcon, AlertIcon, ChevronRightIcon,
} from '../../../../shared/components/icons';
import { AthleteTodaySummary } from './AthleteTodaySummary';
import { listAlerts, type Alert } from '../../../../features/alerts/alertService';
import { listMessages, type CommunityMessage } from '../../../../features/community/communityService';
import { listBlogPosts, type BlogPost } from '../../../../features/blog/blogService';
import type { AthleteTabParamList } from '../../../../navigation/AthleteTabs';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type TodayData = {
  athlete: { id: string; name: string; sport: string };
  readiness: { sleep: number; hrv: number; recovery: number; score: number };
  todaySessions: Array<{ id: string; name: string; time: string; endTime: string; location: string; status: string }>;
  activeWorkouts: Array<{ id: string; contentName: string; modality: string; status: string; progress: number }>;
};

type BadgeTone = 'primary' | 'success' | 'warning' | 'error' | 'neutral';

type TodayNav = CompositeNavigationProp<
  BottomTabNavigationProp<AthleteTabParamList, 'Today'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function toneForStatus(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'confirmed' || s === 'active') return 'success';
  if (s === 'pending' || s === 'scheduled') return 'warning';
  return 'neutral';
}

export function TodayScreen() {
  const navigation = useNavigation<TodayNav>();
  const { user } = useUser();
  const firstName = user?.firstName || 'Deportista';

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

  // Fetch real streak from gamification API
  const { data: streakData } = useStreak();

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

  // Active challenge for today
  const { data: activeChallenge, isLoading: challengeLoading } = useQuery({
    queryKey: ['active-challenge-today'],
    queryFn: async () => {
      const { data } = await apiClient.get('/athlete/challenges/active');
      return (data as any)?.data ?? null;
    },
    staleTime: 60 * 1000,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const hasData = !!data;
  const hasSessions = hasData && (data.todaySessions.length > 0 || data.activeWorkouts.length > 0);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  useEffect(() => {
    listAlerts().then(setAlerts).catch(() => setAlerts([]));
  }, []);

  const latestChatMessage = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
  const displayedArticles = blogPosts.slice(0, 3);

  const goDiscussionForum = () =>
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('DiscussionForum');

  const goArticles = () =>
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('Articles');

  // Derive activity ring values from readiness data (0-1 scale)
  const moveProgress = data ? Math.min(1, data.todaySessions.length / 3) : 0;
  const exerciseProgress = data ? Math.min(1, data.activeWorkouts.length / 2) : 0;
  const recoveryProgress = data ? data.readiness.recovery / 100 : 0;

  // Total minutes from active workouts (estimate from progress)
  const totalMinutes = data?.activeWorkouts.reduce((sum, w) => sum + Math.round(w.progress * 0.6), 0) ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerHi}>
              Hola, <Text style={styles.headerName}>{firstName}</Text>
            </Text>
            <Text style={styles.headerSubtitle}>Es momento de superar tus límites.</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              accessibilityLabel="Buscar"
              accessibilityRole="button"
              onPress={() => navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('Search')}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            >
              <SearchIcon size={20} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              accessibilityLabel="Notificaciones"
              accessibilityRole="button"
              onPress={() => navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('Notifications')}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            >
              <BellIcon size={20} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              accessibilityLabel="Perfil"
              accessibilityRole="button"
              onPress={() => (navigation as unknown as { navigate: (s: string) => void }).navigate('Profile')}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            >
              <UserIcon size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Athlete readiness summary */}
        <AthleteTodaySummary athleteId={user?.id ?? ''} />

        {/* Bento grid layout */}
        {isLoading ? (
          <EmptyState variant="loading" />
        ) : !hasData ? (
          <EmptyState variant="empty" message="Todavía no hay datos" />
        ) : (
          <BentoGrid columns={2}>
            {/* Activity Rings — spans 2 columns */}
            <BentoItem span={2}>
              <Card style={styles.ringsCard}>
                <View style={styles.ringsHeader}>
                  <Text style={styles.ringsTitle}>Actividad Hoy</Text>
                  {data.readiness.score > 0 && (
                    <StreakBadge count={streakData?.current ?? 0} inactive={streakData?.current === 0} />
                  )}
                </View>
                <View style={styles.ringsRow}>
                  <ActivityRings
                    move={moveProgress}
                    exercise={exerciseProgress}
                    recovery={recoveryProgress}
                    size={140}
                  />
                  <View style={styles.ringsLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#C8FF00' }]} />
                      <Text style={styles.legendLabel}>Mover</Text>
                      <Text style={styles.legendValue}>{Math.round(moveProgress * 100)}%</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#34D399' }]} />
                      <Text style={styles.legendLabel}>Ejercicio</Text>
                      <Text style={styles.legendValue}>{Math.round(exerciseProgress * 100)}%</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#3B9EFF' }]} />
                      <Text style={styles.legendLabel}>Recuperación</Text>
                      <Text style={styles.legendValue}>{Math.round(recoveryProgress * 100)}%</Text>
                    </View>
                  </View>
                </View>
              </Card>
            </BentoItem>

            {/* Stats row — 1 col each */}
            <BentoItem>
              <StatCard value={data.todaySessions.length} label="Sesiones" />
            </BentoItem>
            <BentoItem>
              <StatCard value={`${totalMinutes}`} label="Minutos" unit="min" />
            </BentoItem>
            <BentoItem>
              <StatCard value={data.activeWorkouts.length} label="En progreso" />
            </BentoItem>
            <BentoItem>
              <StatCard value={data.readiness.score || 0} label="Readiness" />
            </BentoItem>

            {/* Active Workouts — spans 2 columns */}
            {data.activeWorkouts.length > 0 && (
              <BentoItem span={2}>
                <Text style={styles.sectionTitle}>Continuar Entrenamiento</Text>
                {data.activeWorkouts.map((w) => (
                  <WorkoutCard
                    key={w.id}
                    name={w.contentName}
                    difficulty="intermediate"
                    exerciseCount={1}
                    durationMin={Math.round(w.progress * 0.6)}
                    onPress={() =>
                      navigation
                        .getParent<NativeStackNavigationProp<RootStackParamList>>()
                        ?.navigate('WorkoutDetail', { workoutId: w.id })
                    }
                  />
                ))}
              </BentoItem>
            )}

            {/* Upcoming Sessions — spans 2 columns */}
            {data.todaySessions.length > 0 && (
              <BentoItem span={2}>
                <Text style={styles.sectionTitle}>Sesiones de Hoy</Text>
                {data.todaySessions.map((s) => (
                  <Card key={s.id} style={styles.sessionCard}>
                    <View style={styles.cardAccent} />
                    <View style={styles.sessionTop}>
                      <Text style={styles.sessionTitle} numberOfLines={1}>{s.name}</Text>
                      <Badge text={s.status} tone={toneForStatus(s.status)} />
                    </View>
                    <Text style={styles.sessionMeta}>
                      {s.time} — {s.endTime}
                      {s.location ? ` · ${s.location}` : ''}
                    </Text>
                  </Card>
                ))}
              </BentoItem>
            )}
          </BentoGrid>
        )}

        {/* Community Chat */}
        <Card onPress={goDiscussionForum} style={styles.chatCard}>
          <View style={styles.chatTopRow}>
            <View style={styles.chatAccentDot} />
            <Text style={styles.chatLabel}>Comunidad</Text>
            <Text style={styles.chatAffordance}>Ver chat</Text>
          </View>
          {latestChatMessage ? (
            <>
              <Text style={styles.chatSender} numberOfLines={1}>
                {latestChatMessage.userName}
              </Text>
              <Text style={styles.chatMessage} numberOfLines={1}>
                {latestChatMessage.message}
              </Text>
            </>
          ) : (
            <Text style={styles.chatEmpty}>Sin mensajes todavia</Text>
          )}
        </Card>

        {/* Active Challenge */}
        <ChallengeHomeCard challenge={activeChallenge} loading={challengeLoading} />

        {/* Articles */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Artículos</Text>
            {displayedArticles.length > 0 && (
              <Pressable onPress={goArticles} style={styles.seeAllBtn}>
                <Text style={styles.seeAll}>Ver todo</Text>
                <ChevronRightIcon size={16} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
          {displayedArticles.length > 0 ? (
            <View style={styles.articlesList}>
              {displayedArticles.map((post) => (
                <Card key={post.id} onPress={goArticles} style={styles.articleRowCard}>
                  <View style={styles.cardAccent} />
                  <Text style={styles.articleRowTitle} numberOfLines={2}>
                    {post.title}
                  </Text>
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState variant="empty" message="Sin artículos todavía" />
          )}
        </View>

        {/* Alert banners */}
        {alerts.length > 0 && (
          <Card style={styles.alertCard}>
            {alerts.slice(0, 2).map((a, i) => (
              <View key={`${a.id ?? a.type}-${i}`} style={[styles.alertRow, i > 0 && styles.alertBorder]}>
                <AlertIcon
                  size={16}
                  color={a.severity === 'high' ? colors.error : a.severity === 'medium' ? colors.warning : colors.info}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>{a.title}</Text>
                  <Text style={styles.alertMessage} numberOfLines={2}>
                    {a.message}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: spacing.lg, paddingBottom: 120, gap: spacing.lg },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerLeft: { flex: 1, gap: 2 },
  headerHi: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
  },
  headerName: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.primary,
  },
  headerSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2, fontSize: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: { opacity: 0.6 },

  // Activity rings card
  ringsCard: { gap: spacing.md },
  ringsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ringsTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.primary,
  },
  ringsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  ringsLegend: { flex: 1, gap: spacing.sm },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  legendValue: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 13,
  },

  // Section headers
  section: { gap: spacing.md },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  seeAll: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 },

  // Session cards (inside bento)
  sessionCard: {
    position: 'relative',
    overflow: 'hidden',
    paddingLeft: spacing.lg,
    marginBottom: spacing.sm,
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.primary },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
  sessionTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, lineHeight: 20 },
  sessionMeta: { ...typography.caption, color: colors.textSecondary },

  // Community chat
  chatCard: { position: 'relative', overflow: 'hidden', paddingLeft: spacing.lg },
  chatTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chatAccentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  chatLabel: { ...typography.overline, color: colors.primary, flex: 1 },
  chatAffordance: { fontFamily: fontFamilies.bodyMedium, fontSize: 12, color: colors.textSecondary },
  chatSender: { ...typography.bodyStrong, color: colors.text, fontSize: 14, marginTop: spacing.sm },
  chatMessage: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  chatEmpty: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },

  // Articles
  articlesList: { gap: spacing.md },
  articleRowCard: {
    position: 'relative',
    overflow: 'hidden',
    paddingLeft: spacing.lg,
  },
  articleRowTitle: { ...typography.bodyStrong, color: colors.text, fontSize: 14, lineHeight: 20, paddingVertical: spacing.xs },

  // Alerts
  alertCard: { padding: 0, overflow: 'hidden', borderRadius: radius.lg, marginBottom: spacing.md },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md },
  alertBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  alertTitle: { ...typography.bodyStrong, color: colors.text, fontSize: 13 },
  alertMessage: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
