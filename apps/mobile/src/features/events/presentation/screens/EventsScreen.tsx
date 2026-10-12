import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { useWsSubscription } from '../../../../shared/hooks/useWsSubscription';
import { colors, layout, spacing, typography, radius, fontFamilies } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { Card } from '../../../../shared/components/ui/Card';
import { Badge } from '../../../../shared/components/ui/Badge';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { DayStrip, type CalendarDay } from '../../../../shared/components/ui/DayStrip';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { SectionHeader } from '../../../../shared/components/ui/SectionHeader';
import { CalendarIcon, ClockIcon, MapPinIcon, CheckIcon } from '../../../../shared/components/icons';
import type { AthleteTabParamList } from '../../../../navigation/AthleteTabs';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.eventsScreen;

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

/** Per-type accent (dot + card bar) — Gestalt similarity: like events read alike. */
function accentForType(type?: string): string {
  const s = (type ?? '').toLowerCase();
  if (s.includes('run') || s.includes('carrera')) return colors.success;
  if (s.includes('compet') || s.includes('challenge') || s.includes('reto')) return colors.warning;
  return colors.primary;
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
  return a.title.localeCompare(tb);
}

/** Days between today and the event date (0 = today, 1 = tomorrow). */
function daysUntil(dateStr: string): number {
  const key = dayKey(dateStr);
  if (!key) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const event = new Date(`${key}T00:00:00`);
  return Math.round((event.getTime() - today.getTime()) / 86400000);
}

/** Urgency tone for the countdown badge. */
function urgencyTone(days: number): { text: string; color: string } {
  if (days <= 0) return { text: t.today, color: colors.error };
  if (days === 1) return { text: t.tomorrow, color: colors.warning };
  if (days <= 7) return { text: `${days} ${t.daysUntil}`, color: colors.warning };
  return { text: `${days} ${t.daysUntil}`, color: colors.success };
}

export function EventsScreen() {
  const navigation = useNavigation<EventsNav>();
  const queryClient = useQueryClient();

  // Real-time: coach creates/updates events on web → push notification via WS
  // → invalidate the list so athletes see changes instantly.
  useWsSubscription('events', (msg) => {
    if (msg.type === 'events.updated') {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data } = await apiClient.get('/events');
      if (Array.isArray(data)) return data as EventItem[];
      if (Array.isArray((data as any)?.events)) return (data as any).events as EventItem[];
      if (Array.isArray((data as any)?.data)) return (data as any).data as EventItem[];
      try {
        const reg = await apiClient.get('/athlete/events');
        const rd = reg.data;
        if (Array.isArray(rd)) return rd as EventItem[];
        if (Array.isArray((rd as any)?.events)) return (rd as any).events as EventItem[];
        if (Array.isArray((rd as any)?.data)) return (rd as any).data as EventItem[];
      } catch {
        // Registration endpoint may fail for fresh accounts — ignore.
      }
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

  // --- Hero: next upcoming event ---
  const nextEvent = useMemo(() => {
    const upcoming = events
      .map((ev) => ({ ...ev, _days: daysUntil(ev.date) }))
      .filter((ev) => ev._days >= 0)
      .sort((a, b) => a._days - b._days);
    return upcoming[0] ?? null;
  }, [events]);

  // --- This week: events in the next 7 days (excluding the hero) ---
  const thisWeek = useMemo(() => {
    return events
      .map((ev) => ({ ...ev, _days: daysUntil(ev.date) }))
      .filter((ev) => ev._days >= 0 && ev._days <= 7 && ev.id !== nextEvent?.id)
      .sort((a, b) => a._days - b._days || compareByTime(a, b));
  }, [events, nextEvent]);

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
  const hasEvents = events.length > 0;
  const openEvent = (id: string) =>
    navigation
      .getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.navigate('EventDetail', { eventId: id });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={t.headerTitle} subtitle={formatHeaderDate(selectedKey)} />

        {showLoading ? (
          <Skeleton.List rows={4} height={100} />
        ) : isError ? (
          <EmptyState variant="error" onRetry={() => refetch()} />
        ) : !hasEvents ? (
          <EmptyState variant="empty" message={t.emptyNoEvents} />
        ) : (
          <>
            {/* --- HERO: Next upcoming event --- */}
            {nextEvent && (
              <View style={styles.heroSection}>
                <SectionHeader title={t.nextEventTitle} />
                <Pressable
                  onPress={() => openEvent(nextEvent.id)}
                  accessibilityRole="button"
                  accessibilityLabel={nextEvent.title}
                  style={({ pressed }) => [styles.heroCard, pressed && styles.cardPressed]}
                >
                  <Card style={[styles.card, styles.heroCardInner, { borderLeftColor: accentForType(nextEvent.type) }]}>
                    <View style={[styles.cardAccent, { backgroundColor: accentForType(nextEvent.type) }]} />
                    <View style={styles.heroTopRow}>
                      <View style={[styles.typeDot, { backgroundColor: accentForType(nextEvent.type) }]} />
                      <Text style={styles.typeText} numberOfLines={1}>
                        {(nextEvent.type ?? t.fallbackTitle).toUpperCase()}
                      </Text>
                      <Badge
                        text={urgencyTone(daysUntil(nextEvent.date)).text}
                        tone={daysUntil(nextEvent.date) <= 1 ? 'error' : daysUntil(nextEvent.date) <= 7 ? 'warning' : 'success'}
                      />
                    </View>
                    <Text style={styles.heroTitle} numberOfLines={2}>
                      {nextEvent.title}
                    </Text>
                    <View style={styles.metaRow}>
                      <CalendarIcon size={14} color={colors.textSecondary} />
                      <Text style={styles.heroMeta}>{formatDate(nextEvent.date)}</Text>
                      {!!nextEvent.time && (
                        <>
                          <ClockIcon size={14} color={colors.textSecondary} />
                          <Text style={styles.heroMeta}>{nextEvent.time}</Text>
                        </>
                      )}
                    </View>
                    {!!nextEvent.location && (
                      <View style={styles.metaRow}>
                        <MapPinIcon size={14} color={colors.textSecondary} />
                        <Text style={styles.heroMeta} numberOfLines={1}>{nextEvent.location}</Text>
                      </View>
                    )}
                  </Card>
                </Pressable>
              </View>
            )}

            {/* --- THIS WEEK: horizontal scroll of upcoming events --- */}
            {thisWeek.length > 0 && (
              <View style={styles.weekSection}>
                <SectionHeader title={t.thisWeekTitle} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.weekScroll}
                >
                  {thisWeek.map((ev) => {
                    const accent = accentForType(ev.type);
                    const d = daysUntil(ev.date);
                    return (
                      <Pressable
                        key={ev.id}
                        onPress={() => openEvent(ev.id)}
                        accessibilityRole="button"
                        accessibilityLabel={ev.title}
                        style={({ pressed }) => [styles.weekCard, pressed && styles.cardPressed]}
                      >
                        <Card style={[styles.card, styles.weekCardInner, { borderLeftColor: accent }]}>
                          <View style={[styles.cardAccent, { backgroundColor: accent }]} />
                          <View style={styles.weekDays}>
                            <Text style={[styles.weekDaysText, { color: d <= 1 ? colors.error : d <= 7 ? colors.warning : colors.success }]}>
                              {d === 0 ? t.today : d === 1 ? t.tomorrow : `${d} ${t.daysUntil}`}
                            </Text>
                          </View>
                          <Text style={styles.weekTitle} numberOfLines={2}>
                            {ev.title}
                          </Text>
                          <View style={styles.metaRow}>
                            <ClockIcon size={12} color={colors.textSecondary} />
                            <Text style={styles.metaText}>{ev.time ?? '—'}</Text>
                          </View>
                        </Card>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* --- CALENDAR: browse all dates --- */}
            <View style={styles.calendarSection}>
              <DayStrip days={days} selectedKey={selectedKey} onSelect={setSelectedKey} onEndReached={extendWindow} />

              {selectedEvents.length === 0 ? (
                <EmptyState variant="empty" message={t.emptyDay} />
              ) : (
                <View style={styles.list}>
                  {selectedEvents.map((ev) => {
                    const accent = accentForType(ev.type);
                    return (
                      <Pressable
                        key={ev.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${ev.title}${ev.time ? `, ${ev.time}` : ''}, ${formatDate(ev.date)}`}
                        onPress={() => openEvent(ev.id)}
                        style={({ pressed }) => [pressed && styles.cardPressed]}
                      >
                        <Card style={[styles.card, { borderLeftColor: accent }]}>
                          <View style={[styles.cardAccent, { backgroundColor: accent }]} />
                          <View style={styles.cardTopRow}>
                            <View style={[styles.typeDot, { backgroundColor: accent }]} />
                            <Text style={styles.typeText} numberOfLines={1}>
                              {(ev.type ?? t.fallbackTitle).toUpperCase()}
                            </Text>
                            {!!ev.status && <Badge text={ev.status} tone={toneForEventStatus(ev.status)} />}
                          </View>
                          <Text style={styles.cardTitle} numberOfLines={2}>
                            {ev.title}
                          </Text>
                          <View style={styles.metaRow}>
                            <CalendarIcon size={12} color={colors.textSecondary} />
                            <Text style={styles.metaText}>{formatDate(ev.date)}</Text>
                            {!!ev.time && (
                              <>
                                <ClockIcon size={12} color={colors.textSecondary} />
                                <Text style={styles.metaText}>{ev.time}</Text>
                              </>
                            )}
                            {!!ev.location && (
                              <>
                                <MapPinIcon size={12} color={colors.textSecondary} />
                                <Text style={[styles.metaText, styles.metaLocation]} numberOfLines={1}>
                                  {ev.location}
                                </Text>
                              </>
                            )}
                          </View>
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { paddingHorizontal: layout.pagePadding, paddingBottom: 100 },
  cardPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  card: {
    position: 'relative',
    overflow: 'hidden',
    paddingLeft: spacing.lg,
    borderLeftWidth: 2,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  typeDot: { width: 8, height: 8, borderRadius: radius.full },
  typeText: { ...typography.label, color: colors.primary, flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, lineHeight: 22, marginBottom: spacing.sm },

  // --- Hero ---
  heroSection: { gap: spacing.sm, marginBottom: spacing.md },
  heroCard: { marginHorizontal: 0 },
  heroCardInner: {
    paddingVertical: spacing.lg,
    borderLeftWidth: 3,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 28,
    marginBottom: spacing.md,
  },
  heroMeta: { ...typography.body, color: colors.textSecondary, fontSize: 15 },

  // --- This week ---
  weekSection: { gap: spacing.sm, marginBottom: spacing.md },
  weekScroll: { gap: spacing.md },
  weekCard: { width: 200 },
  weekCardInner: { minHeight: 120, justifyContent: 'space-between' },
  weekDays: { marginBottom: spacing.xs },
  weekDaysText: { ...typography.caption, fontWeight: '700' },
  weekTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.xs,
    flex: 1,
  },

  // --- Calendar ---
  calendarSection: { gap: spacing.sm },
  list: { gap: spacing.sm, paddingTop: spacing.sm },

  // --- Shared ---
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  metaText: { ...typography.caption, color: colors.textSecondary },
  metaLocation: { flexShrink: 1 },
});
