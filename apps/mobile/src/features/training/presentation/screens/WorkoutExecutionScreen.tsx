import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, typography } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { Input } from '../../../../shared/components/ui/Input';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { ProgressBar } from '../../../../shared/components/ui/ProgressBar';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { TrophyIcon, InfoIcon } from '../../../../shared/components/icons';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import {
  clearSessionResume,
  getSessionResume,
  saveSessionResume,
  type SessionResume,
} from './executionResume';
import { syncIfPossible } from '../../../../infrastructure/health';
import { definitionFor } from '../../../ai/application/definitions';
import { shouldUseAiFor } from './aiWorkoutTrigger';
import { FormAnalyzer, type FormMetrics } from '../components/FormAnalyzer';
import { RepCounter } from '../components/RepCounter';
import { WeightInput } from '../components/WeightInput';
import { UpNextPreview, type UpNextExercise } from '../components/UpNextPreview';
import { BadgeUnlockToast } from '../../../../shared/components/gamification/BadgeUnlockToast';
import { PRCelebrationAnimation } from '../../../../shared/components/gamification/PRCelebrationAnimation';
import { StreakBadge } from '../../../../shared/components/gamification/StreakBadge';
import { AchievementBadge } from '../../../../shared/components/gamification/AchievementBadge';
import { useStreak, useLogWorkout, useBadges, useCheckBadges } from '../../../../features/gamification/hooks';
import { useFormRecording } from '../../hooks/useFormRecording';
import { RecordingConsent } from '../components/RecordingConsent';

type ExerciseMode = 'reps' | 'time' | 'cardio';

type Exercise = {
  id: string;
  workoutId: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  restSeconds: number | null;
  sortOrder: number;
  notes: string | null;
  mode?: ExerciseMode;
  phase?: 'work' | 'warmup';
  supersetGroup?: string | null;
  perSide?: boolean;
  sec?: number | null;
};

type Workout = {
  id: string;
  contentName: string;
  status: string;
  progress: number;
};

type WorkoutDetailData = {
  workout: Workout;
  exercises: Exercise[];
};

type PrescriptionItem = {
  exerciseId: string;
  kind: 'first' | 'up' | 'hold' | 'deload' | 'off';
  weightKg: number | null;
  reps: number | null;
  sec: number | null;
  sets: number | null;
  why: [string, ...unknown[]] | null;
};

type PrescriptionData = {
  prescriptions: PrescriptionItem[];
};

type SessionExercise = {
  exerciseId: string;
  name: string;
  pr: { est: number; weightKg: number; reps: number; prevEst: number } | null;
  est1rm: number | null;
};

type SessionLiveData = {
  session: { id: string } | null;
  exercises: SessionExercise[];
};

type Advance = 'next-set' | 'next-exercise' | 'done';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutExecution'>;

type SetPayload = {
  weightKg?: number;
  reps?: number;
  sec?: number;
  rir?: number;
};

function formatWhy(why: PrescriptionItem['why'] | undefined): string | null {
  if (!why || why.length === 0) return null;
  const template = String(why[0]);
  return template.replace(/\{(\d+)\}/g, (_, i) => String(why[Number(i) + 1] ?? ''));
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function toNumberOrUndefined(raw: string): number | undefined {
  const n = parseFloat(raw);
  return Number.isNaN(n) ? undefined : n;
}

function mapToUpNextExercise(ex: Exercise, prescription?: PrescriptionItem): UpNextExercise {
  return {
    name: ex.name,
    sets: prescription?.sets ?? ex.sets,
    reps: prescription?.reps ?? ex.reps,
    weightKg: prescription?.weightKg ?? ex.weightKg,
    mode: ex.mode,
    sec: prescription?.sec ?? ex.sec,
  };
}

const DEFAULT_FORM_METRICS: FormMetrics = { depth: 0, alignment: 0, tempo: 0 };
const FORM_SCORE_THRESHOLD = 60;

export function WorkoutExecutionScreen({ route, navigation }: Props) {
  const { sessionId, workoutId } = route.params;

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [weightValue, setWeightValue] = useState(0);
  const [repsInput, setRepsInput] = useState('');
  const [secInput, setSecInput] = useState('');
  const [rirInput, setRirInput] = useState('');
  const [currentReps, setCurrentReps] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [completedPrs, setCompletedPrs] = useState<Array<{ name: string; est: number }>>([]);
  const [resume, setResume] = useState<SessionResume | null>(null);
  const [formScore, setFormScore] = useState(0);
  const [formMetrics, setFormMetrics] = useState<FormMetrics>(DEFAULT_FORM_METRICS);
  const [formFeedback, setFormFeedback] = useState<string | null>(null);

  // Gamification hooks
  const { data: streakData } = useStreak();
  const logWorkoutMutation = useLogWorkout();
  const { data: badges = [] } = useBadges({
    currentStreak: streakData?.current ?? 0,
    longestStreak: streakData?.longest ?? 0,
    totalWorkouts: 0,
    totalPRs: 0,
    feedInteractions: 0,
  });
  const checkBadgesMutation = useCheckBadges();

  // Form recording hook — collects metrics with consent
  const {
    hasConsent,
    pendingCount,
    handleConsentResponse,
    saveMetrics,
    syncPending,
  } = useFormRecording();

  // Local gamification state for UI
  const [showBadgeToast, setShowBadgeToast] = useState(false);
  const [currentBadgeName, setCurrentBadgeName] = useState('');
  const [showPrAnimation, setShowPrAnimation] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['workout-detail', workoutId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/athlete/workouts/${workoutId}`);
      return data as WorkoutDetailData;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: prescription } = useQuery({
    queryKey: ['workout-prescription', workoutId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/athlete/workouts/${workoutId}/prescription`);
      return data as PrescriptionData;
    },
    staleTime: 5 * 60 * 1000,
  });

  const exercises = data?.exercises ?? [];
  const currentExercise = exercises[currentExerciseIndex] as Exercise | undefined;
  const prescriptionByExerciseId = new Map(
    (prescription?.prescriptions ?? []).map((p) => [p.exerciseId, p]),
  );
  const currentPrescription = currentExercise
    ? prescriptionByExerciseId.get(currentExercise.id)
    : undefined;

  const aiActive = currentExercise ? shouldUseAiFor(currentExercise) : false;
  const aiExerciseId =
    aiActive && currentExercise
      ? definitionFor(currentExercise.name.trim().toLowerCase())?.id ?? null
      : null;
  const aiTarget = currentPrescription?.reps ?? currentExercise?.reps ?? 0;

  const handleOpenAiWorkout = () => {
    if (!aiExerciseId) return;
    navigation.navigate('AiWorkout', {
      sessionId, workoutId, exerciseId: aiExerciseId, target: aiTarget,
    });
  };

  const isTimeMode = currentExercise?.mode === 'time';
  const isCardioMode = currentExercise?.mode === 'cardio';
  const effectiveTargetKg = currentPrescription?.weightKg ?? currentExercise?.weightKg ?? null;
  const isBodyweight =
    !isTimeMode && !isCardioMode && effectiveTargetKg != null && effectiveTargetKg <= 0;

  // Elapsed-time counter while mounted.
  useEffect(() => {
    const id = setInterval(() => setDurationSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Load any persisted resume buffer for this session.
  useEffect(() => {
    let active = true;
    getSessionResume().then((r) => {
      if (active) setResume(r);
    });
    return () => { active = false; };
  }, []);

  // Reset form analysis when exercise changes.
  useEffect(() => {
    setFormScore(0);
    setFormMetrics(DEFAULT_FORM_METRICS);
    setFormFeedback(null);
    setCurrentReps(0);
  }, [currentExerciseIndex]);

  // Sync weight value from prescription when exercise changes.
  useEffect(() => {
    if (currentPrescription?.weightKg != null && currentPrescription.weightKg > 0) {
      setWeightValue(currentPrescription.weightKg);
    } else if (currentExercise?.weightKg != null && currentExercise.weightKg > 0) {
      setWeightValue(currentExercise.weightKg);
    } else {
      setWeightValue(0);
    }
  }, [currentExerciseIndex, currentPrescription, currentExercise]);

  // Trigger PR celebration when workout completes with PRs
  useEffect(() => {
    if (completed && completedPrs.length > 0) {
      setShowPrAnimation(true);
    }
  }, [completed, completedPrs]);

  const showsResume =
    !!resume &&
    resume.sessionId === sessionId &&
    (resume.currentExerciseIndex > 0 || resume.currentSetIndex > 0);

  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const setsSinceStart = exercises
    .slice(0, currentExerciseIndex)
    .reduce((sum, ex) => sum + ex.sets, 0);
  const computedProgress = totalSets > 0 ? (setsSinceStart + currentSetIndex) / totalSets : 0;

  const isLastExercise = currentExerciseIndex >= exercises.length - 1;
  const isLastSet = currentSetIndex >= (currentExercise?.sets ?? 0) - 1;
  const buttonLabel = isLastExercise && isLastSet ? 'Finalizar' : 'Loggear / Siguiente';

  // Up-next exercises (next 1-2 exercises).
  const upcomingExercises = exercises
    .slice(currentExerciseIndex + 1, currentExerciseIndex + 3)
    .map((ex) => mapToUpNextExercise(ex, prescriptionByExerciseId.get(ex.id)));

  const targetReps = currentPrescription?.reps ?? currentExercise?.reps ?? 0;

  const collectPrs = async (): Promise<Array<{ name: string; est: number }>> => {
    try {
      const { data } = await apiClient.get(`/athlete/sessions/${sessionId}`);
      const live = data as SessionLiveData;
      return (live.exercises ?? [])
        .filter((e) => e.pr)
        .map((e) => ({ name: e.name, est: e.pr!.est }));
    } catch {
      return [];
    }
  };

  const logSetMutation = useMutation({
    mutationFn: async (
      payload: SetPayload,
    ): Promise<{ advance: Advance; resume: SessionResume | null }> => {
      const exercise = exercises[currentExerciseIndex] as Exercise;
      await apiClient.post(`/athlete/sessions/${sessionId}/sets`, {
        exerciseId: exercise.id,
        setIndex: currentSetIndex,
        weightKg: payload.weightKg,
        reps: payload.reps,
        sec: payload.sec,
        rir: payload.rir,
      });

      if (currentSetIndex < exercise.sets - 1) {
        return {
          advance: 'next-set',
          resume: { sessionId, currentExerciseIndex, currentSetIndex: currentSetIndex + 1 },
        };
      }

      await apiClient.post(`/athlete/sessions/${sessionId}/progress`, {
        currentExerciseIndex: currentExerciseIndex + 1,
        durationSeconds,
      });

      if (isLastExercise) {
        const prs = await collectPrs();
        await apiClient.post(`/athlete/sessions/${sessionId}/complete`, {});
        setCompletedPrs(prs);
        void syncIfPossible().catch(() => undefined);
        return { advance: 'done', resume: null };
      }

      return {
        advance: 'next-exercise',
        resume: {
          sessionId, currentExerciseIndex: currentExerciseIndex + 1, currentSetIndex: 0,
        },
      };
    },
    onSuccess: ({ advance, resume: nextResume }) => {
      if (advance === 'next-set') {
        setCurrentSetIndex((i) => i + 1);
      } else if (advance === 'next-exercise') {
        setCurrentExerciseIndex((i) => i + 1);
        setCurrentSetIndex(0);

        // Check for streak milestone badge
        const newSetIndex = 0;
        const newExerciseIndex = currentExerciseIndex + 1;
        if (newExerciseIndex === Math.floor(exercises.length / 2)) {
          setCurrentBadgeName('Medio Camino');
          setShowBadgeToast(true);
        }
      } else {
        setFinalDuration(durationSeconds);
        setCompleted(true);

        // Sync form recordings to server (background)
        syncPending().catch(() => {
          // Sync failed — videos remain local for next app open
        });

        // Log workout to gamification API
        const today = new Date().toISOString().split('T')[0];
        logWorkoutMutation.mutate({
          workoutDate: today,
          workoutType: data?.workout?.contentName ?? 'workout',
          durationMinutes: Math.round(durationSeconds / 60),
          caloriesBurned: 0,
        });

        // Check for new badges
        checkBadgesMutation.mutate(
          {
            totalWorkouts: 1,
            totalPRs: completedPrs.length,
            feedInteractions: 0,
          },
          {
            onSuccess: (newBadges) => {
              if (newBadges.length > 0) {
                setCurrentBadgeName(newBadges[0].badgeId);
                setShowBadgeToast(true);
              }
            },
          },
        );

        // Unlock workout completion badge
        setCurrentBadgeName('Entrenamiento Completado');
        setShowBadgeToast(true);
      }

      if (nextResume) {
        saveSessionResume(
          nextResume.sessionId, nextResume.currentExerciseIndex, nextResume.currentSetIndex,
        );
      } else {
        clearSessionResume();
      }

      setRepsInput('');
      setSecInput('');
      setRirInput('');
      setCurrentReps(0);
    },
    onError: (err) => {
      console.error('Failed to log set:', err);
      Alert.alert('Could not log set', 'Please try again.');
    },
  });

  const handleNext = async () => {
    if (!currentExercise) return;

    // Save form metrics if consent given and score exists
    if (hasConsent && formScore > 0) {
      await saveMetrics(
        currentExercise.id,
        currentExercise.name,
        workoutId,
        formScore,
        formMetrics,
      );
    }

    const payload: SetPayload = {};
    const sec = toNumberOrUndefined(secInput);
    const rir = toNumberOrUndefined(rirInput);
    if (!isBodyweight && !isTimeMode) payload.weightKg = weightValue;
    if (!isTimeMode) payload.reps = currentReps || toNumberOrUndefined(repsInput);
    if (isTimeMode && sec !== undefined) payload.sec = sec;
    if (!isTimeMode && sec !== undefined) payload.sec = sec;
    if (rir !== undefined) payload.rir = rir;
    logSetMutation.mutate(payload);
  };

  const handleResume = () => {
    if (!resume) return;
    const maxIndex = Math.max(0, exercises.length - 1);
    setCurrentExerciseIndex(Math.min(resume.currentExerciseIndex, maxIndex));
    setCurrentSetIndex(resume.currentSetIndex);
    setResume(null);
    clearSessionResume();
  };

  const whyText = formatWhy(currentPrescription?.why);
  const targetLabel = isTimeMode
    ? `${currentPrescription?.sec ?? currentExercise?.sec ?? 0}s por serie`
    : [
        `${currentExercise?.sets ?? 0} × ${currentPrescription?.reps ?? currentExercise?.reps}`,
        isBodyweight ? '' : `@ ${currentPrescription?.weightKg ?? currentExercise?.weightKg ?? 0} kg`,
        currentExercise?.perSide ? '(por lado)' : '',
      ]
        .filter(Boolean)
        .join(' ');

  const title = completed
    ? (data?.workout.contentName ?? 'Workout')
    : (currentExercise?.name ?? 'Workout');

  return (
    <SafeAreaView style={styles.container}>
      <RecordingConsent onConsent={handleConsentResponse} />
      <BadgeUnlockToast
        badgeName={currentBadgeName}
        visible={showBadgeToast}
        onDismiss={() => setShowBadgeToast(false)}
      />
      <View style={styles.headerRow}>
        <ScreenHeader title={title} onBack={() => navigation.goBack()} />
        <View style={styles.headerRight}>
          {(streakData?.current ?? 0) > 0 && <StreakBadge count={streakData?.current ?? 0} />}
          {hasConsent && pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>{pendingCount}</Text>
            </View>
          )}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <EmptyState variant="loading" message="Loading workout..." />
        ) : isError || !data ? (
          <EmptyState variant="error" message="Could not load workout" onRetry={refetch} />
        ) : !currentExercise ? (
          <EmptyState variant="empty" message="No exercises" />
        ) : completed ? (
          <View style={styles.summaryWrap}>
            <PRCelebrationAnimation
              visible={showPrAnimation}
              onComplete={() => setShowPrAnimation(false)}
            />
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>WORKOUT COMPLETE</Text>
              <Text style={styles.summaryTitle}>{data.workout.contentName}</Text>
              <Text style={styles.summaryTime}>{formatDuration(finalDuration)}</Text>
              <Text style={styles.summaryMeta}>
                {exercises.length} exercises · {totalSets} sets
              </Text>
              {completedPrs.length > 0 ? (
                <View style={styles.prWrap}>
                  <View style={styles.prHeadingRow}>
                    <TrophyIcon size={16} color={colors.primary} />
                    <Text style={styles.prHeading}>NUEVOS RÉCORDS</Text>
                  </View>
                  {completedPrs.map((pr) => (
                    <Text key={`${pr.name}-${pr.est}`} style={styles.prLine}>
                      {pr.name} · e1RM {pr.est} kg
                    </Text>
                  ))}
                </View>
              ) : null}
              <View style={styles.badgesWrap}>
                {badges.map((badge) => (
                  <AchievementBadge key={badge.badgeId} title={badge.badgeId} unlocked />
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.goBack()}
                style={styles.summaryButton}
              >
                <Text style={styles.summaryButtonLabel}>Done</Text>
              </Pressable>
            </Card>
          </View>
        ) : (
          <>
            {showsResume ? (
              <Pressable
                accessibilityRole="button"
                onPress={handleResume}
                style={styles.resumeBanner}
              >
                <Text style={styles.resumeLabel}>REANUDAR</Text>
                <Text style={styles.resumeHint}>Continue where you left off</Text>
              </Pressable>
            ) : null}

            <ProgressBar progress={computedProgress} />

            <View style={styles.exerciseBlock}>
              <Text style={styles.exerciseName}>{currentExercise.name}</Text>
              <Text style={styles.exerciseDetail}>
                {targetLabel}
                {currentExercise.restSeconds ? ` · ${currentExercise.restSeconds}s rest` : ''}
              </Text>
              {whyText ? (
                <View style={styles.whyTextRow}>
                  <InfoIcon size={14} color={colors.primary} />
                  <Text style={styles.whyText}>{whyText}</Text>
                </View>
              ) : null}
              <Text style={styles.setProgress}>
                Serie {currentSetIndex + 1} de {currentExercise.sets}
              </Text>
            </View>

            {aiActive ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Entrenar con IA"
                onPress={handleOpenAiWorkout}
                style={styles.aiCta}
              >
                <Text style={styles.aiCtaLabel}>Entrenar con IA</Text>
              </Pressable>
            ) : null}

            {/* Form Analysis */}
            <FormAnalyzer
              score={formScore}
              metrics={formMetrics}
              feedback={formFeedback}
            />

            {/* Rep Counter with form validation */}
            {!isTimeMode ? (
              <RepCounter
                currentReps={currentReps}
                targetReps={targetReps}
                formScore={formScore}
                formThreshold={FORM_SCORE_THRESHOLD}
                onIncrement={() => setCurrentReps((r) => r + 1)}
                onDecrement={() => setCurrentReps((r) => Math.max(0, r - 1))}
                isAutoCount
              />
            ) : null}

            {/* Weight Input */}
            {!isBodyweight && !isTimeMode ? (
              <WeightInput
                value={weightValue}
                prescribedWeight={currentPrescription?.weightKg}
                onChange={setWeightValue}
              />
            ) : null}

            {/* Time/Seconds input for time mode */}
            {isTimeMode ? (
              <View style={styles.inputsRow}>
                <View style={styles.inputCol}>
                  <Input
                    value={secInput}
                    onChangeText={setSecInput}
                    placeholder="Segundos"
                    keyboardType="numeric"
                    inputMode="numeric"
                  />
                </View>
              </View>
            ) : null}

            {/* RIR Input */}
            <View style={styles.rirRow}>
              <View style={styles.rirCol}>
                <Input
                  value={rirInput}
                  onChangeText={setRirInput}
                  placeholder="RIR"
                  keyboardType="numeric"
                  inputMode="numeric"
                />
              </View>
            </View>

            <PrimaryButton
              label={buttonLabel}
              onPress={handleNext}
              disabled={logSetMutation.isPending}
            />

            {/* Up Next Preview */}
            <UpNextPreview exercises={upcomingExercises} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: spacing.lg, paddingBottom: 120, gap: spacing.lg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pendingBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  pendingText: {
    ...typography.caption,
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 10,
  },

  resumeBanner: {
    backgroundColor: `${colors.primary}1A`,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.xs,
  },
  resumeLabel: { ...typography.label, color: colors.primary },
  resumeHint: { ...typography.caption, color: colors.textSecondary },

  exerciseBlock: { gap: spacing.xs },
  exerciseName: { ...typography.display, color: colors.text },
  exerciseDetail: { ...typography.body, color: colors.textSecondary },
  whyText: { ...typography.caption, color: colors.primary },
  whyTextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  prHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  setProgress: { ...typography.caption, color: colors.primary },

  inputsRow: { flexDirection: 'row', gap: spacing.md },
  inputCol: { flex: 1 },
  rirRow: { flexDirection: 'row', gap: spacing.md },
  rirCol: { width: 84 },

  aiCta: {
    minHeight: 44,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCtaLabel: { ...typography.bodyStrong, color: colors.primary, textTransform: 'uppercase' },

  summaryWrap: { flex: 1, justifyContent: 'center' },
  summaryCard: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  summaryLabel: { ...typography.label, color: colors.primary },
  summaryTitle: { ...typography.title, color: colors.text, textAlign: 'center' },
  summaryTime: { ...typography.display, color: colors.text },
  summaryMeta: { ...typography.caption, color: colors.textSecondary },
  prWrap: { alignItems: 'center', gap: spacing.xs },
  prHeading: { ...typography.label, color: colors.primary, marginTop: spacing.sm },
  prLine: { ...typography.caption, color: colors.text },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  summaryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryButtonLabel: { ...typography.bodyStrong, color: colors.base, textTransform: 'uppercase' },
});
