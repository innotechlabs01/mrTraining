/**
 * RunningWorkoutListScreen — athlete's assigned running workouts.
 * Shows today's and upcoming running assignments with status.
 * Primary action: tap an assignment to open its detail.
 */
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { texts } from '../../../../shared/i18n/texts';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import {
  useRunningWorkoutAssignments,
  useRunningWorkoutTemplate,
  type RunningWorkoutAssignmentDto,
} from '../../application/useRunningWorkouts';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const tw = texts.screens.runningWorkoutList;

function statusColor(status: string): string {
  switch (status) {
    case 'assigned':
    case 'available':
      return colors.primary;
    case 'started':
      return colors.warning;
    case 'completed':
      return colors.success;
    case 'skipped':
    case 'cancelled':
      return colors.textSecondary;
    default:
      return colors.textSecondary;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'assigned': return tw.statusAssigned;
    case 'available': return tw.statusAvailable;
    case 'started': return tw.statusStarted;
    case 'completed': return tw.statusCompleted;
    case 'skipped': return tw.statusSkipped;
    case 'cancelled': return tw.statusCancelled;
    default: return status;
  }
}

export function RunningWorkoutListScreen() {
  const navigation = useNavigation<Nav>();

  const { data: assignments, isLoading, isError, refetch, isRefetching } = useRunningWorkoutAssignments();

  const openAssignment = useCallback(
    (assignmentId: string) => navigation.navigate('RunningWorkoutDetail', { assignmentId }),
    [navigation],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={tw.title} onBack={() => navigation.goBack()} />
        <EmptyState variant="loading" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={tw.title} onBack={() => navigation.goBack()} />
        <EmptyState
          variant="error"
          title={tw.errorTitle}
          message={tw.errorMessage}
          actionLabel={tw.retry}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={tw.title} onBack={() => navigation.goBack()} />
        <EmptyState
          variant="empty"
          title={tw.emptyTitle}
          message={tw.emptyMessage}
          actionLabel={tw.emptyAction}
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const today = localDateKey(new Date());
  const todayAssignments = assignments.filter((a) =>
    a.scheduled_date.startsWith(today),
  );
  const upcomingAssignments = assignments.filter((a) =>
    !a.scheduled_date.startsWith(today),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={tw.title} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
      >
      {todayAssignments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{tw.todaySection}</Text>
          {todayAssignments.map((a) => (
            <PressableAssignment
              key={a.id}
              item={a}
              onPress={() => openAssignment(a.id)}
            />
          ))}
        </View>
      )}

      {upcomingAssignments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{tw.upcomingSection}</Text>
          {upcomingAssignments.map((a) => (
            <PressableAssignment
              key={a.id}
              item={a}
              onPress={() => openAssignment(a.id)}
            />
          ))}
        </View>
      )}

      {todayAssignments.length === 0 && upcomingAssignments.length === 0 && (
        <EmptyState
          variant="empty"
          title={tw.emptyTitle}
          message={tw.emptyMessage}
          actionLabel={tw.emptyAction}
          onAction={() => navigation.goBack()}
        />
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** YYYY-MM-DD in the device's local timezone (toISOString would use UTC). */
function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function PressableAssignment({
  item,
  onPress,
}: {
  item: RunningWorkoutAssignmentDto;
  onPress: () => void;
}) {
  const { data: template } = useRunningWorkoutTemplate(item.template_id);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={styles.cardContent}>
        <View style={styles.row}>
          <Text style={styles.itemName}>{template?.name ?? tw.fallbackName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) }]}>
            <Text style={styles.statusText}>{statusLabel(item.status)}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.itemSubtitle}>{item.athlete_instructions || tw.noInstructions}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.itemMeta}>{new Date(item.scheduled_date).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacing.xl },
  section: { marginHorizontal: spacing.lg, marginTop: spacing.sm },
  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardContent: {},
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { ...typography.label, color: colors.text, flex: 1 },
  itemSubtitle: { ...typography.body, color: colors.textSecondary, flex: 1 },
  itemMeta: { ...typography.caption, color: colors.textSecondary },
  statusBadge: {
    backgroundColor: `${colors.primary}1A`,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: { ...typography.caption, color: colors.primary, textTransform: 'uppercase' },
});


