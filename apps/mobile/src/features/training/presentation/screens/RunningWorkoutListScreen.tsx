/**
 * RunningWorkoutListScreen — athlete's assigned running workouts.
 * Shows today's and upcoming running assignments with status.
 * Primary action: tap an assignment to open its detail.
 */
import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, radius, typography } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { texts } from '../../../../shared/i18n/texts';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface RunningAssignmentItem {
  id: string;
  template_id: string;
  athlete_id: string;
  coach_id: string;
  scheduled_date: string;
  status: 'assigned' | 'available' | 'started' | 'completed' | 'skipped' | 'cancelled';
  athlete_instructions: string;
  created_at: string;
  updated_at: string;
}

const tw = texts.screens.runningWorkoutList;

function statusColor(status: string): string {
  switch (status) {
    case 'assigned':
    case 'available':
      return colors.primary;
    case 'started':
      return colors.warning ?? colors.primary;
    case 'completed':
      return colors.success ?? '#00C853';
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

  const { data: assignments, isLoading, isError, refetch } = useQuery({
    queryKey: ['running-workout-assignments'],
    queryFn: async (): Promise<RunningAssignmentItem[]> => {
      const { data } = await apiClient.get<RunningAssignmentItem[]>(
        '/running/workouts/assignments',
      );
      return data;
    },
    staleTime: 60_000,
  });

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

  const today = new Date().toISOString().split('T')[0];
  const todayAssignments = assignments.filter((a) =>
    a.scheduled_date.startsWith(today),
  );
  const upcomingAssignments = assignments.filter((a) =>
    !a.scheduled_date.startsWith(today),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={tw.title} onBack={() => navigation.goBack()} />

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
    </SafeAreaView>
  );
}

function PressableAssignment({
  item,
  onPress,
}: {
  item: RunningAssignmentItem;
  onPress: () => void;
}) {
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
          <Text style={styles.itemName}>{item.template_id}</Text>
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

// Touchability is not a real React Native export; kept for type compatibility only.
declare const Touchability: never;
