import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, typography, radius, fontFamilies } from '../../../../shared/theme/tokens';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { ProgressBar } from '../../../../shared/components/ui/ProgressBar';
import { Card } from '../../../../shared/components/ui/Card';
import { Badge } from '../../../../shared/components/ui/Badge';
import type { AthleteTabParamList } from '../../../../navigation/AthleteTabs';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type Workout = {
  id: string;
  contentName: string;
  contentType: string;
  modality: string;
  startDate: string;
  status: string;
  progress: number;
};

// New DTO types matching backend responses (camelCase)
type TrainingSession = {
  id: string;
  title: string;
  scheduledAt: string;
  endAt?: string;
  location?: string;
  status: string;
};

// Aggregated weekly summary computed server-side (GET /athlete/progress/summary).
type ProgressSummary = {
  athleteId: string;
  startDate: string;
  endDate: string;
  workoutsCompleted: number;
  totalVolume: number;
  avgCompletionRate: number; // 0-100 percent
  streak: number;
};

type Filter = 'all' | 'completed' | 'pending';

type HistoryNav = CompositeNavigationProp<
  BottomTabNavigationProp<AthleteTabParamList, 'Plan'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type BadgeTone = 'primary' | 'success' | 'warning' | 'error' | 'neutral';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function toneForStatus(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'confirmed' || s === 'active') return 'success';
  if (s === 'pending' || s === 'scheduled') return 'warning';
  return 'neutral';
}

// Format an ISO/UTC date-time into "d MMM, HH:mm" using local device time (Spanish).
function formatDateTime(dateString: string): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  const m = MONTHS[d.getMonth()];
  const day = d.getDate();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${m}, ${hh}:${mm}`;
}

export function HistoryScreen() {
  const navigation = useNavigation<HistoryNav>();
  const [filter, setFilter] = useState<Filter>('all');

  // Upcoming sessions query
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

  // Weekly progress summary query (last 7 days including today) — server-side aggregate.
  const { data: summary, isLoading: progressLoading, refetch: refetchProgress } = useQuery({
    queryKey: ['weekly-progress'],
    queryFn: async () => {
      const today = new Date();
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      const startStr = `${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, '0')}-${start
        .getDate()
        .toString()
        .padStart(2, '0')}`;
      const endStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today
        .getDate()
        .toString()
        .padStart(2, '0')}`;
      // TODO(api-consolidation): no Next.js equivalent yet for weekly progress summary
      // (Go had /progress/summary). Needs `GET /api/athlete/progress/summary` route in apps/web.
      const res = await apiClient.get(`/athlete/progress/summary?start_date=${startStr}&end_date=${endStr}`);
      return (res.data ?? {}) as ProgressSummary;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Existing workout history query
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['athlete-workouts'],
    queryFn: async () => {
      const res = await apiClient.get('/athlete/workouts');
      const raw = res.data?.data ?? res.data?.workouts ?? [];
      return (Array.isArray(raw) ? (raw as Workout[]) : []) as Workout[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Refresh all three queries when the tab regains focus.
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchSessions();
      refetchProgress();
    }, [refetch, refetchSessions, refetchProgress]),
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data;
    if (filter === 'completed') return data.filter((w) => w.status === 'completed');
    return data.filter((w) => w.status !== 'completed');
  }, [data, filter]);

  const isEmpty = !filtered || filtered.length === 0;
  const upcoming = sessions ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <Text style={styles.eyebrow}>PLAN DE ENTRENAMIENTO</Text>
        <Text style={styles.title}>Plan</Text>

        {/* Próximas sesiones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximas Sesiones</Text>
          {sessionsLoading ? (
            <EmptyState variant="loading" message="Cargando sesiones..." />
          ) : upcoming.length === 0 ? (
            <EmptyState variant="empty" message="Sin sesiones próximas" />
          ) : (
            upcoming.map((s) => (
              <Pressable
                key={s.id}
                onPress={() =>
                  navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('WorkoutDetail', {
                    workoutId: s.id,
                  })
                }
                style={({ pressed }) => (pressed ? styles.pressed : undefined)}
              >
                <Card style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardLeft}>
                      <Text style={styles.workoutName} numberOfLines={1}>
                        {s.title}
                      </Text>
                      <Text style={styles.workoutMeta}>
                        {formatDateTime(s.scheduledAt)}
                        {s.endAt ? ` — ${formatDateTime(s.endAt)}` : ''}
                      </Text>
                      {s.location ? <Text style={styles.workoutMeta}>Ubicación: {s.location}</Text> : null}
                    </View>
                    <Badge text={s.status} tone={toneForStatus(s.status)} />
                  </View>
                </Card>
              </Pressable>
            ))
          )}
        </View>

        {/* Resumen semanal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen Semanal</Text>
          {progressLoading ? (
            <EmptyState variant="loading" message="Cargando progreso..." />
          ) : !summary ? (
            <EmptyState variant="empty" message="Sin datos de progreso" />
          ) : (
            <Card style={styles.card}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Entrenamientos Completados</Text>
                <Text style={styles.summaryValue}>{summary.workoutsCompleted}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Volumen Total</Text>
                <Text style={styles.summaryValue}>{summary.totalVolume.toFixed(0)} kg</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Promedio de Completado</Text>
                <Text style={styles.summaryValue}>{summary.avgCompletionRate.toFixed(1)}%</Text>
              </View>
              <View style={styles.progressWrap}>
                <ProgressBar progress={summary.avgCompletionRate / 100} />
              </View>
              <View style={styles.streakRow}>
                <Text style={styles.streakLabel}>Racha</Text>
                <Badge text={`${summary.streak} día${summary.streak === 1 ? '' : 's'}`} tone="primary" />
              </View>
            </Card>
          )}
        </View>

        {/* Historial */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial</Text>

          {/* Filtros segmentados */}
          <View style={styles.segmentRow}>
            {(['all', 'completed', 'pending'] as Filter[]).map((f) => {
              const active = filter === f;
              const label = f === 'all' ? 'Todos' : f === 'completed' ? 'Completados' : 'Pendientes';
              return (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
                >
                  <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {isLoading ? (
            <EmptyState variant="loading" message="Cargando entrenamientos..." />
          ) : !data || data.length === 0 || isEmpty ? (
            <EmptyState variant="empty" />
          ) : (
            filtered.map((w) => {
              const completed = w.status === 'completed';
              const dotColor = completed ? colors.success : colors.warning;
              return (
                <Pressable
                  key={w.id}
                  onPress={() =>
                    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('WorkoutDetail', {
                      workoutId: w.id,
                    })
                  }
                  style={({ pressed }) => (pressed ? styles.pressed : undefined)}
                >
                  <Card style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={styles.cardLeft}>
                        <View style={styles.nameRow}>
                          <View style={[styles.dot, { backgroundColor: dotColor }]} />
                          <Text style={styles.workoutName} numberOfLines={1}>
                            {w.contentName}
                          </Text>
                        </View>
                        <Text style={styles.workoutMeta}>{w.startDate}</Text>
                      </View>
                      <Badge text={w.status} tone={toneForStatus(w.status)} />
                    </View>

                    <ProgressBar progress={completed ? 1 : w.progress / 100} />
                  </Card>
                </Pressable>
              );
            })
          )}
        </View>
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

  segmentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  pill: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: `${colors.primary}1A`,
    borderColor: `${colors.primary}33`,
  },
  pillInactive: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  pillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  pillTextActive: { color: colors.primary },
  pillTextInactive: { color: colors.textSecondary },

  card: { marginBottom: spacing.sm },
  pressed: { opacity: 0.8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  cardLeft: { flex: 1, gap: spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: radius.full },
  workoutName: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '600', lineHeight: 20 },
  workoutMeta: { fontSize: 12, color: colors.textSecondary, fontWeight: '400', marginLeft: spacing.md },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 14, color: colors.text, fontWeight: '700' },
  progressWrap: { marginBottom: spacing.md },
  streakRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streakLabel: { fontSize: 13, color: colors.textSecondary },
});