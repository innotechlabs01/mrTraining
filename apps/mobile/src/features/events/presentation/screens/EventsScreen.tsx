import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, typography, radius } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { Card } from '../../../../shared/components/ui/Card';
import { Badge } from '../../../../shared/components/ui/Badge';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { DayStrip, type CalendarDay } from '../../../../shared/components/ui/DayStrip';
import type { AthleteTabParamList } from '../../../../navigation/AthleteTabs';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type EventItem = {
  id: string;
  title: string;
  date: string;
  time?: string;
  type?: string;
  location?: string;
  status?: string;
};

type EventsNav = CompositeNavigationProp<
  BottomTabNavigationProp<AthleteTabParamList, 'Events'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type BadgeTone = 'primary' | 'success' | 'warning' | 'error' | 'neutral';

const INITIAL_DAYS = 30;
const LOAD_MORE = 15;

function toLocalKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Normalize an API date string to 'YYYY-MM-DD' without timezone drift. */
function dayKey(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr ?? '');
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  try {
    return toLocalKey(new Date(dateStr));
  } catch {
    return '';
  }
}

function toneForEventStatus(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (s === 'confirmed' || s === 'active' || s === 'upcoming') return 'success';
  if (s === 'pending' || s === 'scheduled') return 'warning';
  if (s === 'cancelled' || s === 'canceled') return 'error';
  return 'neutral';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatHeaderDate(key: string): string {
  try {
    return new Date(`${key}T12:00:00`).toLocaleDateString('es', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return key;
  }
}

function compareByTime(a: EventItem, b: EventItem): number {
  const ta = a.time ?? '';
  const tb = b.time ?? '';
  if (ta !== tb) return ta.localeCompare(tb);
  return a.title.localeCompare(b.title);
}

export function EventsScreen() {
  const navigation = useNavigation<EventsNav>();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['athlete-events'],
    queryFn: async () => {
      const { data } = await apiClient.get('/athlete/events');
      if (Array.isArray(data)) return data as EventItem[];
      if (Array.isArray(data.events)) return data.events as EventItem[];
      if (Array.isArray(data.data)) return data.data as EventItem[];
      return [] as EventItem[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const events = data ?? [];
  const todayKey = useMemo(() => toLocalKey(new Date()), []);
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [windowSize, setWindowSize] = useState(INITIAL_DAYS);

  const eventsByDay = useMemo(() => {
    const map: Record<string, EventItem[]> = {};
    for (const ev of events) {
      const key = dayKey(ev.date);
      if (!key) continue;
      (map[key] ??= []).push(ev);
    }
    return map;
  }, [events]);

  const days = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const out: CalendarDay[] = [];
    for (let i = 0; i < windowSize; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const key = toLocalKey(d);
      out.push({
        key,
        weekday: d.toLocaleDateString('es', { weekday: 'short' }),
        dayNumber: d.getDate(),
        month: d.toLocaleDateString('es', { month: 'short' }),
        eventCount: eventsByDay[key]?.length ?? 0,
        isToday: i === 0,
      });
    }
    return out;
  }, [windowSize, eventsByDay]);

  const selectedEvents = useMemo(
    () => [...(eventsByDay[selectedKey] ?? [])].sort(compareByTime),
    [eventsByDay, selectedKey],
  );

  const extendWindow = useCallback(() => {
    setWindowSize((s) => s + LOAD_MORE);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const showLoading = isLoading && events.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Eventos" subtitle={formatHeaderDate(selectedKey)} />

        <DayStrip days={days} selectedKey={selectedKey} onSelect={setSelectedKey} onEndReached={extendWindow} />

        {showLoading ? (
          <EmptyState variant="loading" message="Cargando eventos..." />
        ) : selectedEvents.length === 0 ? (
          <EmptyState variant="empty" message="No hay eventos este día" />
        ) : (
          <View style={styles.list}>
            {selectedEvents.map((ev) => (
              <Pressable
                key={ev.id}
                onPress={() =>
                  navigation
                    .getParent<NativeStackNavigationProp<RootStackParamList>>()
                    ?.navigate('EventDetail', { eventId: ev.id })
                }
                style={({ pressed }) => (pressed ? styles.cardPressed : undefined)}
              >
                <Card style={styles.card}>
                  <View style={styles.cardAccent} />
                  <View style={styles.cardTopRow}>
                    <View style={[styles.typeDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.typeText} numberOfLines={1}>
                      {(ev.type ?? 'Evento').toUpperCase()}
                    </Text>
                    {!!ev.status && <Badge text={ev.status} tone={toneForEventStatus(ev.status)} />}
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {ev.title}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={2}>
                    {formatDate(ev.date)}
                    {ev.time ? ` · ${ev.time}` : ''}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { paddingBottom: 100 },
  list: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  cardPressed: { opacity: 0.85 },
  card: {
    position: 'relative',
    overflow: 'hidden',
    paddingLeft: spacing.lg,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  typeDot: { width: 8, height: 8, borderRadius: radius.full },
  typeText: {
    ...typography.label,
    color: colors.primary,
    flex: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, lineHeight: 22, marginBottom: spacing.sm },
  cardMeta: { ...typography.caption, color: colors.textSecondary },
});