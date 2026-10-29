/**
 * RunningWorkoutDetailScreen — pre-run detail for an assigned running workout.
 * Shows segments, targets (pace/HR), and a primary "Start" button.
 */
import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation } from '@tanstack/react-query';
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

interface RunningTemplateItem {
  id: string;
  coach_id: string;
  name: string;
  description: string;
  type: string;
  target_pace_min_per_km?: number;
  target_pace_max_per_km?: number;
  target_heart_rate_min?: number;
  target_heart_rate_max?: number;
  target_cadence?: number;
  target_distance_km?: number;
  target_duration_sec?: number;
  segments: Array<{
    id: string;
    template_id: string;
    order_index: number;
    type: 'warmup' | 'main' | 'interval' | 'recovery' | 'cooldown';
    instruction: string;
    spoken_instruction?: string;
    target_duration_sec?: number;
    target_distance_km?: number;
    target_pace_min_per_km?: number;
    target_pace_max_per_km?: number;
    target_heart_rate_min?: number;
    target_heart_rate_max?: number;
    repetitions?: number;
    recovery_sec?: number;
    completion_criteria: 'time' | 'distance' | 'manual';
    created_at: string;
    updated_at: string;
  }>;
  created_at: string;
  updated_at: string;
}

const tw = texts.screens.runningWorkoutDetail;

function segmentLabel(type: string): string {
  switch (type) {
    case 'warmup': return tw.segWarmup;
    case 'main': return tw.segMain;
    case 'interval': return tw.segInterval;
    case 'recovery': return tw.segRecovery;
    case 'cooldown': return tw.segCooldown;
    default: return type;
  }
}

export function RunningWorkoutDetailScreen() {
  const navigation = useNavigation<Nav>();
  const assignmentId = navigation.getParam('assignmentId') as string | undefined;

  const { data: assignment, isLoading, isError } = useQuery({
    queryKey: ['running-workout-assignment', assignmentId],
    queryFn: async (): Promise<RunningAssignmentItem> => {
      const { data } = await apiClient.get<RunningAssignmentItem>(
        `/running/workouts/assignments/${assignmentId}`,
      );
      return data;
    },
    enabled: !!assignmentId,
  });

  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ['running-workout-template', assignment?.template_id],
    queryFn: async (): Promise<RunningTemplateItem> => {
      const { data } = await apiClient.get<RunningTemplateItem>(
        `/running/workouts/templates/${assignment?.template_id}`,
      );
      return data;
    },
    enabled: !!assignment?.template_id,
  });

  const startSession = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { data } = await apiClient.post<{ session_id: string }>(
        '/running/workouts/sessions/start',
        { assignment_id: assignmentId },
      );
      return data;
    },
  });

  const handleStart = () => {
    if (!assignmentId) return;
    startSession.mutate(assignmentId, {
      onSuccess: (res) => {
        navigation.navigate('RunningExecution', {
          sessionId: res.session_id,
          workoutId: assignment!.id,
        });
      },
    });
  };

  if (isLoading || templateLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={tw.title} onBack={() => navigation.goBack()} />
        <EmptyState variant="loading" />
      </SafeAreaView>
    );
  }

  if (isError || !assignment || !template) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={tw.title} onBack={() => navigation.goBack()} />
        <EmptyState
          variant="error"
          title={tw.errorTitle}
          message={tw.errorMessage}
          actionLabel={tw.retry}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={tw.title} onBack={() => navigation.goBack()} />

      <View style={styles.headerCard}>
        <Text style={styles.templateName}>{template.name}</Text>
        {template.description && (
          <Text style={styles.templateDesc}>{template.description}</Text>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{tw.typeLabel}</Text>
          <Text style={styles.metaValue}>{template.type}</Text>
        </View>
        {template.target_distance_km && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{tw.distanceLabel}</Text>
            <Text style={styles.metaValue}>{template.target_distance_km.toFixed(1)} km</Text>
          </View>
        )}
        {template.target_duration_sec && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{tw.durationLabel}</Text>
            <Text style={styles.metaValue}>{Math.floor(template.target_duration_sec / 60)} min</Text>
          </View>
        )}
        {template.target_pace_min_per_km && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{tw.paceLabel}</Text>
            <Text style={styles.metaValue}>{template.target_pace_min_per_km.toFixed(2)} min/km</Text>
          </View>
        )}
        {template.target_heart_rate_min && template.target_heart_rate_max && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{tw.hrLabel}</Text>
            <Text style={styles.metaValue}>{template.target_heart_rate_min}–{template.target_heart_rate_max} bpm</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{tw.segmentsTitle}</Text>
        {template.segments.map((seg, idx) => (
          <View key={seg.id} style={styles.segmentCard}>
            <View style={styles.segmentHeader}>
              <Text style={styles.segmentNumber}>{idx + 1}</Text>
              <Text style={styles.segmentType}>{segmentLabel(seg.type)}</Text>
            </View>
            <Text style={styles.segmentInstruction}>{seg.instruction}</Text>
            {seg.spoken_instruction && (
              <Text style={styles.segmentSpoken}>{tw.spokenPrefix} {seg.spoken_instruction}</Text>
            )}
            <View style={styles.segmentMeta}>
              {seg.target_duration_sec && (
                <View style={styles.metaMini}>
                  <Text style={styles.metaMiniLabel}>{tw.duration}</Text>
                  <Text style={styles.metaMiniValue}>{seg.target_duration_sec}s</Text>
                </View>
              )}
              {seg.target_distance_km && (
                <View style={styles.metaMini}>
                  <Text style={styles.metaMiniLabel}>{tw.distance}</Text>
                  <Text style={styles.metaMiniValue}>{seg.target_distance_km.toFixed(2)} km</Text>
                </View>
              )}
              {seg.target_pace_min_per_km && (
                <View style={styles.metaMini}>
                  <Text style={styles.metaMiniLabel}>{tw.pace}</Text>
                  <Text style={styles.metaMiniValue}>{seg.target_pace_min_per_km.toFixed(2)} min/km</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.bottomSpacer} />

      <PrimaryButton
        label={tw.startButton}
        onPress={handleStart}
        loading={startSession.isPending}
        disabled={startSession.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateName: { ...typography.h3, color: colors.text },
  templateDesc: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  metaLabel: { ...typography.caption, color: colors.textSecondary },
  metaValue: { ...typography.label, color: colors.text },
  section: { marginHorizontal: spacing.lg, marginTop: spacing.md },
  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.sm },
  segmentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  segmentNumber: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    backgroundColor: `${colors.primary}1A`,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  segmentType: { ...typography.label, color: colors.primary },
  segmentInstruction: { ...typography.body, color: colors.text, marginTop: spacing.xs },
  segmentSpoken: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  segmentMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  metaMini: {
    alignItems: 'center',
  },
  metaMiniLabel: { ...typography.caption, color: colors.textSecondary },
  metaMiniValue: { ...typography.label, color: colors.text },
  bottomSpacer: { height: spacing.lg * 2 },
});
