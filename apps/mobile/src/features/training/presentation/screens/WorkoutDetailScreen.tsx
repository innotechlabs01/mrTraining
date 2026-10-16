import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, layout, spacing, typography, radius, fontFamilies } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { getVideoState } from '../components/videoState';
import { RunningRouteView } from '../components/RunningRouteView';
import { ExerciseDemoModal } from '../components/execution/ExerciseDemoModal';
import { extractSessionId } from '../../application/sessionStart';
import { BarbellIcon, PlayIcon, MapPinIcon, ClockIcon } from '../../../../shared/components/icons';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.workoutDetailScreen;
const tExec = texts.screens.workoutExecution;
const tVideo = texts.screens.trackedVideoPlayer;

type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  restSeconds: number | null;
  sortOrder: number;
  notes: string | null;
  videoUrl?: string | null | undefined;
  gpsRoute?: string | null | undefined;
  mode?: string | undefined;
  phase?: string | undefined;
};

type Workout = {
  id: string;
  athleteId: string;
  contentName: string;
  status: string;
  progress: number;
};

type PrescriptionExercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weightKg?: number | null;
  restSeconds?: number | null;
  sortOrder: number;
  notes?: string | null;
  mode?: string;
  phase?: string;
  videoUrl?: string | null;
  gpsRoute?: string | null;
  bodyPart?: string;
  muscleGroups?: string;
};

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutDetail'>;

// Phase accent colors — visual grouping (Gestalt continuity).
function phaseAccent(phase?: string): string {
  const p = (phase ?? '').toLowerCase();
  if (p.includes('warm') || p.includes('calentamiento')) return colors.warning;
  if (p.includes('cool') || p.includes('enfriamiento') || p.includes('stretch')) return colors.success;
  return colors.primary; // main / default
}

function phaseLabel(phase?: string): string {
  const p = (phase ?? '').toLowerCase();
  if (p.includes('warm') || p.includes('calentamiento')) return t.phaseWarmup;
  if (p.includes('cool') || p.includes('enfriamiento') || p.includes('stretch')) return t.phaseCooldown;
  return t.phaseMain;
}

// Exercise card video CTA — the 4 first-class video states from the design spec:
// has-video (thumbnail + "Ver demo"), no-video-with-hint ("Sin video demo"),
// error (invalid URL — load error copy). Playback happens only in ExerciseDemoModal
// (lazy mount): no VideoView is mounted inside the list.
function ExerciseVideoCta({
  videoUrl,
  onWatchDemo,
}: {
  videoUrl: string | undefined;
  onWatchDemo: () => void;
}) {
  const state = getVideoState(videoUrl);

  if (state === 'no-video-with-hint') {
    return <Text style={styles.noVideoHint}>{t.noVideoHint}</Text>;
  }

  if (state === 'error') {
    return <Text style={styles.errorText}>{tVideo.loadError}</Text>;
  }

  // has-video: thumbnail + "Ver demo" CTA, tap opens ExerciseDemoModal
  return (
    <Pressable style={styles.thumbnailWrap} onPress={onWatchDemo} hitSlop={8}>
      <View style={styles.thumbnailPlaceholder}>
        <PlayIcon size={48} color={colors.primary} />
      </View>
      <Text style={styles.thumbnailLabel}>{tExec.viewDemo}</Text>
    </Pressable>
  );
}

export function WorkoutDetailScreen({ route, navigation }: Props) {
  const { workoutId } = route.params;
  const queryClient = useQueryClient();

  const { data: workoutData, isLoading: loading1, isError: error1 } = useQuery({
    queryKey: ['workout-detail', workoutId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/athlete/workouts/${workoutId}`);
      return data as { workout: Workout; exercises?: any[] };
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: prescriptionData,
    isLoading: loading2,
    isError: error2,
  } = useQuery({
    queryKey: ['workout-prescription', workoutId],
    queryFn: async (): Promise<PrescriptionExercise[]> => {
      const { data } = await apiClient.get(`/athlete/workouts/${workoutId}/prescription`);
      // The shared axios interceptor already unwraps Go's ListResponse
      // ({ data, total, page, limit }) into a bare array. Tolerate both the
      // bare-array and the wrapped shape so a contract nuance can't blank
      // the screen.
      if (Array.isArray(data)) return data as PrescriptionExercise[];
      return (data as { data?: PrescriptionExercise[] } | null)?.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Prefer the prescription endpoint; fall back to the exercises the detail
  // envelope already returned (identical shape) so the workout never reads
  // empty when the API actually has data.
  const detailExercises =
    (workoutData as { exercises?: PrescriptionExercise[] } | undefined)?.exercises ?? [];
  const rawExercises: PrescriptionExercise[] =
    prescriptionData && prescriptionData.length > 0 ? prescriptionData : detailExercises;

  const exercises: Exercise[] = rawExercises.map((ex) => ({
    id: ex.id,
    name: ex.name,
    sets: ex.sets,
    reps: ex.reps,
    weightKg: ex.weightKg ?? null,
    restSeconds: ex.restSeconds ?? null,
    sortOrder: ex.sortOrder,
    notes: ex.notes ?? '',
    videoUrl: ex.videoUrl ?? undefined,
    gpsRoute: ex.gpsRoute ?? undefined,
    mode: ex.mode,
    phase: ex.phase,
  }));

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(`/athlete/workouts/${workoutId}/session`);
      const sessionId = extractSessionId(data);
      return { id: sessionId };
    },
    onSuccess: (session) => {
      navigation.navigate('WorkoutExecution', { sessionId: session.id, workoutId });
    },
    onError: (err) => {
      console.error('Failed to start session:', err);
      Alert.alert(t.startErrorTitle, t.startErrorBody);
    },
  });

  const isLoading = loading1 || loading2;
  const hasExercises = exercises.length > 0;

  // Demo video modal state
  const [demoVisible, setDemoVisible] = useState(false);
  const [demoVideoUrl, setDemoVideoUrl] = useState<string | null>(null);
  const [demoExerciseId, setDemoExerciseId] = useState<string | null>(null);
  const [demoExerciseName, setDemoExerciseName] = useState<string | null>(null);

  // Estimated total time: sets × (reps_time + rest) per exercise, rough.
  const estimatedMinutes = exercises.reduce((sum, ex) => {
    const perSetMin = (ex.restSeconds ?? 90) / 60;
    return sum + ex.sets * (1.5 / 60 + perSetMin);
  }, 0);

  // Group exercises by phase for visual sections.
  const phaseGroups = useMemo(() => {
    const groups: { phase: string; accent: string; exercises: { ex: Exercise; num: number }[] }[] = [];
    let counter = 1;
    for (const ex of exercises) {
      const label = phaseLabel(ex.phase);
      const accent = phaseAccent(ex.phase);
      let group = groups.find((g) => g.phase === label);
      if (!group) {
        group = { phase: label, accent, exercises: [] };
        groups.push(group);
      }
      group.exercises.push({ ex, num: counter++ });
    }
    return groups;
  }, [exercises]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={workoutData?.workout.contentName ?? t.titleFallback}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              queryClient.invalidateQueries({ queryKey: ['workout-detail', workoutId] });
              queryClient.invalidateQueries({ queryKey: ['workout-prescription', workoutId] });
            }}
            tintColor={colors.primary}
          />
        }>
        {isLoading ? (
          <EmptyState variant="loading" />
        ) : workoutData === null || error1 || error2 ? (
          <EmptyState
            variant="error"
            message={t.loadError}
            onRetry={() => {
              queryClient.invalidateQueries({ queryKey: ['workout-detail', workoutId] });
              queryClient.invalidateQueries({ queryKey: ['workout-prescription', workoutId] });
            }}
          />
        ) : hasExercises ? (
          <>
            {/* --- Summary header --- */}
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{exercises.length}</Text>
                  <Text style={styles.summaryLabel}>{t.totalExercises}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>~{Math.max(10, Math.round(estimatedMinutes))}</Text>
                  <Text style={styles.summaryLabel}>min</Text>
                </View>
              </View>
            </Card>

            {/* --- Exercise cards grouped by phase --- */}
            {phaseGroups.map((group) => (
              <View key={group.phase} style={styles.phaseSection}>
                <View style={[styles.phaseHeader, { borderLeftColor: group.accent }]}>
                  <View style={[styles.phaseDot, { backgroundColor: group.accent }]} />
                  <Text style={[styles.phaseTitle, { color: group.accent }]}>{group.phase}</Text>
                </View>
                {group.exercises.map(({ ex, num }) => (
                  <Card key={ex.id} style={[styles.card, { borderLeftColor: group.accent }]}>
                    <View style={styles.exerciseTopRow}>
                      <View style={[styles.exerciseNumber, { borderColor: group.accent }]}>
                        <Text style={[styles.exerciseNumberText, { color: group.accent }]}>{num}</Text>
                      </View>
                      <View style={styles.exerciseBody}>
                        <Text style={styles.exerciseName}>{ex.name}</Text>
                        <View style={styles.chipRow}>
                          <Chip text={`${ex.sets} × ${ex.reps}`} />
                          {ex.weightKg !== null && ex.weightKg !== undefined && ex.weightKg > 0 && (
                            <Chip text={`${ex.weightKg} kg`} icon="weight" />
                          )}
                          {ex.restSeconds !== null && ex.restSeconds !== undefined && (
                            <Chip text={`${ex.restSeconds}${t.restTag}`} icon="rest" />
                          )}
                        </View>
                      </View>
                    </View>
                    {ex.notes ? <Text style={styles.notes}>{ex.notes}</Text> : null}
                    <ExerciseVideoCta
                      videoUrl={ex.videoUrl ?? undefined}
                      onWatchDemo={() => {
                        setDemoVideoUrl(ex.videoUrl ?? null);
                        setDemoExerciseId(ex.id);
                        setDemoExerciseName(ex.name);
                        setDemoVisible(true);
                      }}
                    />
                    {ex.gpsRoute ? (
                      <View style={styles.mediaWrap}>
                        <View style={styles.gpsLabel}>
                          <MapPinIcon size={14} color={colors.primary} />
                          <Text style={styles.gpsLabelText}>{t.gpsRouteLabel}</Text>
                        </View>
                        <RunningRouteView gpsRoute={ex.gpsRoute} />
                      </View>
                    ) : null}
                  </Card>
                ))}
              </View>
            ))}

            <View style={styles.cta}>
              <PrimaryButton
                label={t.startLabel}
                onPress={() => startSessionMutation.mutate()}
                disabled={startSessionMutation.isPending}
              />
            </View>
          </>
        ) : (
          <EmptyState variant="empty" message={t.emptyExercises} />
        )}
      </ScrollView>
      {demoVisible && demoVideoUrl && demoExerciseId && demoExerciseName && (
        <ExerciseDemoModal
          videoUrl={demoVideoUrl}
          exerciseId={demoExerciseId}
          exerciseName={demoExerciseName}
          showAiCta={false}
          onClose={() => {
            setDemoVisible(false);
            setDemoVideoUrl(null);
            setDemoExerciseId(null);
            setDemoExerciseName(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

// --- Sub-components ---

function Chip({ text, icon }: { text: string; icon?: string }) {
  return (
    <View style={chipStyles.chip}>
      {icon === 'weight' && <BarbellIcon size={12} color={colors.textSecondary} />}
      {icon === 'rest' && <ClockIcon size={12} color={colors.textSecondary} />}
      <Text style={chipStyles.chipText}>{text}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: layout.pagePadding, paddingBottom: 120 },

  // Summary header
  summaryCard: {
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  summaryItem: { alignItems: 'center' },
  summaryValue: {
    fontFamily: fontFamilies.display,
    fontSize: 28,
    color: colors.primary,
    fontWeight: '800',
  },
  summaryLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  summaryDivider: { width: 1, height: 40, backgroundColor: colors.border },

  // Phase sections
  phaseSection: { marginBottom: spacing.md },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderLeftWidth: 3,
    paddingLeft: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 32,
  },
  phaseDot: { width: 10, height: 10, borderRadius: radius.full },
  phaseTitle: {
    ...typography.label,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // Exercise card
  card: {
    position: 'relative',
    overflow: 'hidden',
    paddingLeft: spacing.lg,
    borderLeftWidth: 2,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  exerciseTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  exerciseNumberText: { fontSize: 14, fontWeight: '700' },
  exerciseBody: { flex: 1, gap: spacing.xs },
  exerciseName: { ...typography.bodyStrong, color: colors.text, fontSize: 15 },
  chipRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  notes: { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.xs },

  mediaWrap: { marginTop: spacing.sm },
  gpsLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  gpsLabelText: { ...typography.caption, color: colors.primary, fontWeight: '600' },

  // Video state styles (per spec §2/§3/§7)
  thumbnailWrap: {
    aspectRatio: 16 / 9,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  thumbnailPlaceholder: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailLabel: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  noVideoHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  cta: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
});
