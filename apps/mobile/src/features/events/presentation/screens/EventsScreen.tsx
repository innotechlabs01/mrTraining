
import { useCallback, useMemo, useState } from 'react';
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
  type CompositeNavigationProp,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { useWsSubscription } from '../../../../shared/hooks/useWsSubscription';
import {
  colors,
  layout,
  spacing,
  typography,
  radius,
  fontFamilies,
} from '../../../../shared/theme/tokens';

import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { Card } from '../../../../shared/components/ui/Card';
import { Badge } from '../../../../shared/components/ui/Badge';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import {
  DayStrip,
  type CalendarDay,
} from '../../../../shared/components/ui/DayStrip';
import { SectionHeader } from '../../../../shared/components/ui/SectionHeader';

import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
} from '../../../../shared/components/icons';

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

const EVENTS_QUERY_KEY = ['events'] as const;
const INITIAL_DAYS = 30;
const MAX_DAYS = 90;
const LOAD_MORE = 15;

function toLocalKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** Preserves YYYY-MM-DD from API strings to avoid timezone shifts. */
function dayKey(value: string): string {
  if (!value) return '';

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (match) {
    const [, year, month, day] = match;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      12,
    );

    if (
      parsed.getFullYear() !== Number(year) ||
      parsed.getMonth() !== Number(month) - 1 ||
      parsed.getDate() !== Number(day)
    ) {
      return '';
    }

    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? '' : toLocalKey(parsed);
}

function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function toneForEventStatus(status?: string): BadgeTone {
  const value = (status ?? '').toLowerCase();

  if (['confirmed', 'active', 'upcoming'].includes(value)) {
    return 'success';
  }

  if (['pending', 'scheduled'].includes(value)) {
    return 'warning';
  }

  if (['cancelled', 'canceled'].includes(value)) {
    return 'error';
  }

  return 'neutral';
}

function accentForType(type?: string): string {
  const value = (type ?? '').toLowerCase();

  if (
    value.includes('run') ||
    value.includes('carrera') ||
    value.includes('running')
  ) {
    return colors.success;
  }

  if (
    value.includes('compet') ||
    value.includes('challenge') ||
    value.includes('reto')
  ) {
    return colors.warning;
  }

  return colors.primary;
}

function formatDate(value: string): string {
  const key = dayKey(value);

  if (!key) return '—';

  return dateFromKey(key).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatHeaderDate(key: string): string {
  return dateFromKey(key).toLocaleDateString('es-CO', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function compareByTime(a: EventItem, b: EventItem): number {
  const timeA = a.time ?? '23:59';
  const timeB = b.time ?? '23:59';

  if (timeA !== timeB) {
    return timeA.localeCompare(timeB);
  }

  return a.title.localeCompare(b.title, 'es');
}

function daysUntil(dateValue: string, todayKey: string): number {
  const eventKey = dayKey(dateValue);

  if (!eventKey) return 999;

  const [yearA, monthA, dayA] = todayKey.split('-').map(Number);
  const [yearB, monthB, dayB] = eventKey.split('-').map(Number);

  const todayUtc = Date.UTC(yearA, monthA - 1, dayA);
  const eventUtc = Date.UTC(yearB, monthB - 1, dayB);

  return Math.round((eventUtc - todayUtc) / 86_400_000);
}

function urgencyLabel(days: number): string {
  if (days === 0) return t.today;
  if (days === 1) return t.tomorrow;

  return `${days} ${t.daysUntil}`;
}

function urgencyBadgeTone(days: number): BadgeTone {
  if (days <= 1) return 'warning';
  if (days <= 7) return 'primary';

  return 'success';
}

function normalizeEvents(response: unknown): EventItem[] {
  if (Array.isArray(response)) return response as EventItem[];

  if (!response || typeof response !== 'object') {
    throw new Error('Formato de respuesta de eventos inválido.');
  }

  const body = response as Record<string, unknown>;

  if (Array.isArray(body.events)) return body.events as EventItem[];
  if (Array.isArray(body.data)) return body.data as EventItem[];

  if (body.data && typeof body.data === 'object') {
    const nested = body.data as Record<string, unknown>;

    if (Array.isArray(nested.events)) {
      return nested.events as EventItem[];
    }

    if (Array.isArray(nested.items)) {
      return nested.items as EventItem[];
    }
  }

  if (Array.isArray(body.items)) return body.items as EventItem[];

  throw new Error('No se encontró la lista de eventos.');
}

async function fetchEvents(): Promise<EventItem[]> {
  try {
    const response = await apiClient.get('/events');
    return normalizeEvents(response.data).filter(
      (event) => event && event.id && event.title && dayKey(event.date),
    );
  } catch (primaryError) {
    try {
      const response = await apiClient.get('/athlete/events');

      return normalizeEvents(response.data).filter(
        (event) => event && event.id && event.title && dayKey(event.date),
      );
    } catch {
      throw primaryError;
    }
  }
}

function createCalendarDays(
  todayKey: string,
  count: number,
  eventsByDay: Record<string, EventItem[]>,
): CalendarDay[] {
  const base = dateFromKey(todayKey);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() + index);

    const key = toLocalKey(date);

    return {
      key,
      weekday: date
        .toLocaleDateString('es-CO', { weekday: 'short' })
        .replace('.', ''),
      dayNumber: date.getDate(),
      month: date
        .toLocaleDateString('es-CO', { month: 'short' })
        .replace('.', ''),
      eventCount: eventsByDay[key]?.length ?? 0,
      isToday: key === todayKey,
    };
  });
}

export function EventsScreen() {
  const navigation = useNavigation<EventsNav>();
  const queryClient = useQueryClient();

  const [todayKey] = useState(() => toLocalKey(new Date()));
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [windowSize, setWindowSize] = useState(INITIAL_DAYS);

  useWsSubscription('events', (message) => {
    if (message.type === 'events.updated') {
      void queryClient.invalidateQueries({
        queryKey: EVENTS_QUERY_KEY,
      });
    }
  });

  const {
    data: events = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: EVENTS_QUERY_KEY,
    queryFn: fetchEvents,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const eventsByDay = useMemo(() => {
    const result: Record<string, EventItem[]> = {};

    for (const event of events) {
      const key = dayKey(event.date);
      if (!key) continue;

      if (!result[key]) result[key] = [];
      result[key].push(event);
    }

    Object.values(result).forEach((items) => items.sort(compareByTime));

    return result;
  }, [events]);

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((event) => {
          const status = (event.status ?? '').toLowerCase();

          return (
            dayKey(event.date) >= todayKey &&
            !['cancelled', 'canceled', 'completed', 'finished'].includes(status)
          );
        })
        .sort((a, b) => {
          const dateA = dayKey(a.date);
          const dateB = dayKey(b.date);

          if (dateA !== dateB) return dateA.localeCompare(dateB);

          return compareByTime(a, b);
        }),
    [events, todayKey],
  );

  const nextEvent = upcomingEvents[0] ?? null;

  const thisWeek = useMemo(
    () =>
      upcomingEvents.filter((event) => {
        const days = daysUntil(event.date, todayKey);

        return days >= 0 && days <= 7 && event.id !== nextEvent?.id;
      }),
    [upcomingEvents, todayKey, nextEvent],
  );

  const days = useMemo(
    () => createCalendarDays(todayKey, windowSize, eventsByDay),
    [todayKey, windowSize, eventsByDay],
  );

  const selectedEvents = eventsByDay[selectedKey] ?? [];

  const extendWindow = useCallback(() => {
    setWindowSize((current) => Math.min(current + LOAD_MORE, MAX_DAYS));
  }, []);

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const openEvent = useCallback(
    (id: string) => {
      navigation
        .getParent<NativeStackNavigationProp<RootStackParamList>>()
        ?.navigate('EventDetail', { eventId: id });
    },
    [navigation],
  );

  const showLoading = isLoading && events.length === 0;
  const showError = isError && events.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderText}>
            <Text style={styles.eyebrow}>TU ENTRENAMIENTO</Text>
            <ScreenHeader
              title={t.headerTitle}
              subtitle={formatHeaderDate(selectedKey)}
            />
          </View>

          <View style={styles.headerIcon}>
            <CalendarIcon size={23} color={colors.primary} />
          </View>
        </View>

        {showLoading ? (
          <View style={styles.loadingContainer}>
            <Skeleton.List rows={4} height={104} />
          </View>
        ) : showError ? (
          <View style={styles.stateContainer}>
            <EmptyState
              variant="error"
              onRetry={() => {
                void refetch();
              }}
            />
          </View>
        ) : events.length === 0 ? (
          <View style={styles.stateContainer}>
            <EmptyState variant="empty" message={t.emptyNoEvents} />
          </View>
        ) : (
          <>
            {nextEvent ? (
              <View style={styles.section}>
                <SectionHeader title={t.nextEventTitle} />

                <Pressable
                  onPress={() => openEvent(nextEvent.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver evento ${nextEvent.title}`}
                  style={({ pressed }) => [
                    styles.heroPressable,
                    pressed && styles.pressed,
                  ]}
                >
                  <Card
                    style={[
                      styles.cardBase,
                      styles.heroCard,
                      {
                        borderColor: accentForType(nextEvent.type),
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.heroAccent,
                        { backgroundColor: accentForType(nextEvent.type) },
                      ]}
                    />

                    <View style={styles.heroContent}>
                      <View style={styles.heroTopRow}>
                        <View style={styles.typeLabel}>
                          <View
                            style={[
                              styles.typeDot,
                              {
                                backgroundColor: accentForType(nextEvent.type),
                              },
                            ]}
                          />

                          <Text
                            style={styles.typeText}
                            numberOfLines={1}
                          >
                            {(nextEvent.type ?? t.fallbackTitle).toUpperCase()}
                          </Text>
                        </View>

                        <Badge
                          text={urgencyLabel(
                            daysUntil(nextEvent.date, todayKey),
                          )}
                          tone={urgencyBadgeTone(
                            daysUntil(nextEvent.date, todayKey),
                          )}
                        />
                      </View>

                      <Text style={styles.heroTitle} numberOfLines={3}>
                        {nextEvent.title}
                      </Text>

                      <View style={styles.heroDivider} />

                      <View style={styles.heroMetaGrid}>
                        <View style={styles.metaRow}>
                          <CalendarIcon
                            size={15}
                            color={colors.textSecondary}
                          />
                          <Text style={styles.heroMeta} numberOfLines={1}>
                            {formatDate(nextEvent.date)}
                          </Text>
                        </View>

                        {nextEvent.time ? (
                          <View style={styles.metaRow}>
                            <ClockIcon
                              size={15}
                              color={colors.textSecondary}
                            />
                            <Text style={styles.heroMeta}>
                              {nextEvent.time}
                            </Text>
                          </View>
                        ) : null}

                        {nextEvent.location ? (
                          <View style={styles.metaRow}>
                            <MapPinIcon
                              size={15}
                              color={colors.textSecondary}
                            />
                            <Text
                              style={styles.heroMeta}
                              numberOfLines={2}
                            >
                              {nextEvent.location}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.heroFooter}>
                        <Text style={styles.viewDetails}>Ver detalles</Text>
                        <Text style={styles.arrow}>›</Text>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              </View>
            ) : null}

            {thisWeek.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <SectionHeader title={t.thisWeekTitle} />
                  <Text style={styles.sectionCount}>
                    {thisWeek.length} {thisWeek.length === 1 ? 'evento' : 'eventos'}
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.weekScroll}
                >
                  {thisWeek.map((event) => {
                    const accent = accentForType(event.type);
                    const daysAway = daysUntil(event.date, todayKey);

                    return (
                      <Pressable
                        key={event.id}
                        onPress={() => openEvent(event.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Ver evento ${event.title}`}
                        style={({ pressed }) => [
                          styles.weekPressable,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Card
                          style={[
                            styles.cardBase,
                            styles.weekCard,
                            { borderTopColor: accent },
                          ]}
                        >
                          <View style={styles.weekCardTop}>
                            <View
                              style={[
                                styles.weekIcon,
                                { backgroundColor: `${accent}18` },
                              ]}
                            >
                              <CalendarIcon size={17} color={accent} />
                            </View>

                            <Text
                              style={[
                                styles.weekDaysText,
                                { color: accent },
                              ]}
                            >
                              {urgencyLabel(daysAway)}
                            </Text>
                          </View>

                          <Text style={styles.weekTitle} numberOfLines={2}>
                            {event.title}
                          </Text>

                          <View style={styles.weekMeta}>
                            <ClockIcon
                              size={13}
                              color={colors.textSecondary}
                            />
                            <Text style={styles.metaText}>
                              {event.time ?? 'Hora por confirmar'}
                            </Text>
                          </View>

                          <View style={styles.weekFooter}>
                            <Text style={styles.viewDetails}>Detalles</Text>
                            <Text style={styles.arrow}>›</Text>
                          </View>
                        </Card>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.calendarSection}>
              <View style={styles.calendarHeading}>
                <View>
                  <Text style={styles.calendarTitle}>Tu agenda</Text>
                  <Text style={styles.calendarSubtitle}>
                    Consulta los eventos por día
                  </Text>
                </View>

                <View style={styles.calendarCount}>
                  <Text style={styles.calendarCountText}>
                    {selectedEvents.length}
                  </Text>
                </View>
              </View>

              <View style={styles.dayStripContainer}>
                <DayStrip
                  days={days}
                  selectedKey={selectedKey}
                  onSelect={setSelectedKey}
                  onEndReached={extendWindow}
                />
              </View>

              <View style={styles.selectedDayHeading}>
                <View>
                  <Text style={styles.selectedDayTitle}>
                    {selectedKey === todayKey ? 'Hoy' : 'Eventos del día'}
                  </Text>
                  <Text style={styles.selectedDaySubtitle}>
                    {formatHeaderDate(selectedKey)}
                  </Text>
                </View>

                {selectedEvents.length > 0 ? (
                  <Badge
                    text={`${selectedEvents.length}`}
                    tone="primary"
                  />
                ) : null}
              </View>

              {selectedEvents.length === 0 ? (
                <View style={styles.emptyDay}>
                  <View style={styles.emptyDayIcon}>
                    <CalendarIcon
                      size={23}
                      color={colors.textSecondary}
                    />
                  </View>

                  <Text style={styles.emptyDayTitle}>
                    No hay eventos este día
                  </Text>

                  <Text style={styles.emptyDayDescription}>
                    Selecciona otra fecha para revisar tu agenda.
                  </Text>
                </View>
              ) : (
                <View style={styles.eventList}>
                  {selectedEvents.map((event) => {
                    const accent = accentForType(event.type);

                    return (
                      <Pressable
                        key={event.id}
                        onPress={() => openEvent(event.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Ver evento ${event.title}`}
                        style={({ pressed }) => [
                          styles.eventPressable,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Card style={styles.listCard}>
                          <View
                            style={[
                              styles.listAccent,
                              { backgroundColor: accent },
                            ]}
                          />

                          <View style={styles.listContent}>
                            <View style={styles.listTopRow}>
                              <View style={styles.typeLabel}>
                                <View
                                  style={[
                                    styles.typeDot,
                                    { backgroundColor: accent },
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.typeText,
                                    { color: accent },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {(event.type ?? t.fallbackTitle).toUpperCase()}
                                </Text>
                              </View>

                              {event.status ? (
                                <Badge
                                  text={event.status}
                                  tone={toneForEventStatus(event.status)}
                                />
                              ) : null}
                            </View>

                            <Text style={styles.listTitle} numberOfLines={2}>
                              {event.title}
                            </Text>

                            <View style={styles.listMeta}>
                              <View style={styles.metaRow}>
                                <CalendarIcon
                                  size={14}
                                  color={colors.textSecondary}
                                />
                                <Text style={styles.metaText}>
                                  {formatDate(event.date)}
                                </Text>
                              </View>

                              {event.time ? (
                                <View style={styles.metaRow}>
                                  <ClockIcon
                                    size={14}
                                    color={colors.textSecondary}
                                  />
                                  <Text style={styles.metaText}>
                                    {event.time}
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            {event.location ? (
                              <View style={styles.locationRow}>
                                <MapPinIcon
                                  size={14}
                                  color={colors.textSecondary}
                                />
                                <Text
                                  style={styles.metaText}
                                  numberOfLines={2}
                                >
                                  {event.location}
                                </Text>
                              </View>
                            ) : null}

                            <View style={styles.listFooter}>
                              <Text style={styles.viewDetails}>
                                Ver detalles
                              </Text>
                              <Text style={styles.arrow}>›</Text>
                            </View>
                          </View>
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {windowSize < MAX_DAYS ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={extendWindow}
                  style={({ pressed }) => [
                    styles.loadMoreButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.loadMoreText}>
                    Mostrar más días
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
  },

  content: {
    paddingHorizontal: layout.pagePadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl ?? spacing.lg * 3,
  },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl ?? spacing.lg * 3,
  },

  pageHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  eyebrow: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: fontFamilies.bodySemiBold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },

  headerIcon: {
    width: 46,
    height: 46,
    marginLeft: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: {
    marginBottom: spacing.xxl ?? spacing.lg * 3,
  },

  sectionHeading: {
    marginBottom: spacing.lg,
  },

  sectionCount: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: -spacing.xs,
  },

  heroPressable: {
    borderRadius: radius.xl,
  },

  cardBase: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },

  heroCard: {
    padding: 0,
  },

  heroAccent: {
    height: 5,
    width: '100%',
  },

  heroContent: {
    padding: spacing.xl,
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  typeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    minWidth: 0,
  },

  typeDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },

  typeText: {
    ...typography.label,
    color: colors.textSecondary,
    flexShrink: 1,
    letterSpacing: 0.6,
  },

  heroTitle: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 31,
    fontFamily: fontFamilies.bodyBold,
    marginBottom: spacing.md,
  },

  heroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },

  heroMetaGrid: {
    gap: spacing.sm,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
  },

  heroMeta: {
    ...typography.body,
    color: colors.textSecondary,
    flexShrink: 1,
  },

  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },

  viewDetails: {
    ...typography.label,
    color: colors.primary,
    fontFamily: fontFamilies.bodySemiBold,
  },

  arrow: {
    color: colors.primary,
    fontSize: 21,
    lineHeight: 22,
    marginLeft: spacing.xs,
  },

  weekScroll: {
    gap: spacing.lg,
    paddingRight: spacing.lg,
    paddingBottom: spacing.sm,
  },

  weekPressable: {
    width: 235,
  },

  weekCard: {
    minHeight: 190,
    padding: spacing.lg,
    borderTopWidth: 4,
    justifyContent: 'space-between',
  },

  weekCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },

  weekIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  weekDaysText: {
    ...typography.caption,
    fontFamily: fontFamilies.bodySemiBold,
    flexShrink: 1,
  },

  weekTitle: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fontFamilies.bodySemiBold,
    flex: 1,
    marginBottom: spacing.md,
  },

  weekMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },

  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,
  },

  weekFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: spacing.sm,
  },

  calendarSection: {
    marginTop: spacing.lg,
  },

  calendarHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },

  calendarTitle: {
    color: colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontFamily: fontFamilies.bodyBold,
  },

  calendarSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  calendarCount: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarCountText: {
    color: colors.text,
    fontSize: 14,
    fontFamily: fontFamilies.bodySemiBold,
  },

  dayStripContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxl ?? spacing.lg * 3,
    paddingVertical: spacing.sm,
  },

  selectedDayHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },

  selectedDayTitle: {
    color: colors.text,
    fontSize: 17,
    fontFamily: fontFamilies.bodySemiBold,
  },

  selectedDaySubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },

  eventList: {
    gap: spacing.lg,
  },

  eventPressable: {
    borderRadius: radius.xl,
  },

  listCard: {
    flexDirection: 'row',
    padding: 0,
    borderRadius: radius.xl,
  },

  listAccent: {
    width: 4,
  },

  listContent: {
    flex: 1,
    minWidth: 0,
    padding: spacing.lg,
  },

  listTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  listTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontFamily: fontFamilies.bodySemiBold,
    marginBottom: spacing.md,
  },

  listMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },

  listFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },

  emptyDay: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  emptyDayIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },

  emptyDayTitle: {
    color: colors.text,
    fontSize: 16,
    fontFamily: fontFamilies.bodySemiBold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },

  emptyDayDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },

  loadMoreButton: {
    alignSelf: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    justifyContent: 'center',
  },

  loadMoreText: {
    ...typography.label,
    color: colors.primary,
    fontFamily: fontFamilies.bodySemiBold,
  },

  loadingContainer: {
    marginTop: spacing.md,
  },

  stateContainer: {
    flex: 1,
    paddingTop: spacing.xl,
  },

  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
