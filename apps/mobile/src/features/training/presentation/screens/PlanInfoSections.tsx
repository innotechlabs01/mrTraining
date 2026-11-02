import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, fontFamilies } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { Badge } from '../../../../shared/components/ui/Badge';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.planInfoSections;

export type Workout = {
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

export type TrainingSession = {
  id: string;
  title: string;
  scheduledAt: string;
  endAt?: string;
  location?: string;
  status: string;
};

export type PlanInfo = {
  assigned: number;
  completed: number;
  days: number[];
};

// Backend contract: daysOfWeek 0=Sunday ... 6=Saturday.
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type BadgeTone = 'primary' | 'success' | 'warning' | 'error' | 'neutral';

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

// Date-only comparison: "Mañana" when the workout starts the day after today.
function formatDayLabel(startDate: string, tomorrowStr: string): string {
  const datePart = startDate.slice(0, 10);
  if (datePart === tomorrowStr) return t.tomorrow;
  const [y, m, d] = datePart.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
}

export function PlanInfoCard({
  plan,
  loading,
  onEmpty,
}: {
  plan: PlanInfo;
  loading: boolean;
  onEmpty: boolean;
}) {
  if (loading) {
    return <EmptyState variant="loading" message={t.loadingPlan} />;
  }
  if (onEmpty) {
    return <EmptyState variant="empty" message={t.planEmpty} />;
  }
  const daysLabel = plan.days.length > 0 ? plan.days.map((d) => DAYS[d]).join(' · ') : '—';
  return (
    <Card>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{t.assignedLabel}</Text>
        <Text style={styles.infoValue}>{plan.assigned}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{t.completedLabel}</Text>
        <Text style={styles.infoValue}>{plan.completed}</Text>
      </View>
      {plan.days.length > 0 ? (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t.daysLabel}</Text>
          <Text style={styles.infoValue}>{daysLabel}</Text>
        </View>
      ) : null}
    </Card>
  );
}

export type UpcomingWorkoutItem = {
  id: string;
  contentName: string;
  status: string;
  nextDate: string;
};

export function UpcomingWorkoutsSection({
  items,
  loading,
  tomorrowStr,
  onOpen,
}: {
  items: UpcomingWorkoutItem[];
  loading: boolean;
  tomorrowStr: string;
  onOpen: (id: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t.upcomingTitle}</Text>
      {loading ? (
        <EmptyState variant="loading" message={t.loadingWorkouts} />
      ) : items.length === 0 ? (
        <EmptyState variant="empty" message={t.noUpcoming} />
      ) : (
        items.map((w) => (
          <Pressable
            key={w.id}
            onPress={() => onOpen(w.id)}
            style={({ pressed }) => (pressed ? styles.pressed : undefined)}
          >
            <Card style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <Text style={styles.workoutName} numberOfLines={1}>
                    {w.contentName}
                  </Text>
                  <Text style={styles.workoutMeta}>{formatDayLabel(w.nextDate, tomorrowStr)}</Text>
                </View>
                <Badge text={w.status} tone={toneForStatus(w.status)} />
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </View>
  );
}

export function UpcomingSessionsSection({
  items,
  loading,
  onOpen,
}: {
  items: TrainingSession[];
  loading: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t.sessionsTitle}</Text>
      {loading ? (
        <EmptyState variant="loading" message={t.loadingSessions} />
      ) : items.length === 0 ? (
        <EmptyState variant="empty" message={t.noSessions} />
      ) : (
        items.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => onOpen(s.id)}
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
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  card: { marginBottom: spacing.sm },
  pressed: { opacity: 0.8 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardLeft: { flex: 1, gap: spacing.xs },
  workoutName: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '600', lineHeight: 20 },
  workoutMeta: { fontSize: 12, color: colors.textSecondary, fontWeight: '400' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoLabel: { fontSize: 13, color: colors.textSecondary },
  infoValue: { fontSize: 14, color: colors.text, fontWeight: '700' },
});