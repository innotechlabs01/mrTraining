import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, layout, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { ProgressBar } from '../../../../shared/components/ui/ProgressBar';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { BadgeUnlockToast } from '../../../../shared/components/gamification/BadgeUnlockToast';
import { StreakBadge } from '../../../../shared/components/gamification/StreakBadge';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { useWorkoutExecution } from '../../application/useWorkoutExecution';
import {
  formatDuration,
  FORM_SCORE_THRESHOLD,
  interpolate,
  type Exercise,
  type PrescriptionItem,
  type RunningInterval,
} from '../../application/workoutExecutionTypes';
import { FormAnalyzer } from '../components/FormAnalyzer';
import { RepCounter } from '../components/RepCounter';
import { WeightInput } from '../components/WeightInput';
import { UpNextPreview, type UpNextExercise } from '../components/UpNextPreview';
import { RecordingConsent } from '../components/RecordingConsent';
import { CompletionSummary } from '../components/execution/CompletionSummary';
import { AiWorkoutCta } from '../components/execution/AiWorkoutCta';
import { ExerciseCard } from '../components/execution/ExerciseCard';
import { ExerciseDemoModal } from '../components/execution/ExerciseDemoModal';
import { isPlayableVideoUrl } from '../../../../shared/components/video/isPlayableVideoUrl';
import { PendingSyncBadge } from '../components/execution/PendingSyncBadge';
import { RestOverlay } from '../components/execution/RestOverlay';
import { SetInput } from '../components/execution/SetInput';
import { RunningRouteView } from '../components/RunningRouteView';
import { IntervalTracker } from '../components/execution/IntervalTracker';
import { useGpsTracking } from '../../hooks/useGpsTracking';
import { reportRunningProgress } from '../../../infrastructure/api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutExecution'>;

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

export function WorkoutExecutionScreen({ route, navigation }: Props) {
  const { sessionId, workoutId } = route.params;
  const vm = useWorkoutExecution({ sessionId, workoutId, navigation });
  const t = vm.t;

  // GPS tracking for running exercises with route
  const gpsRoute = vm.currentPrescription?.gpsRoute;
  const intervals = (vm.currentExercise as Exercise & { intervals?: RunningInterval[] })
    ?.intervals ?? [];
  const isRunningExercise =
    !!gpsRoute &&
    !!(
      vm.currentExercise?.mode === 'cardio' ||
      vm.currentExercise?.name?.toLowerCase().includes('run')
    );
  const { isTracking, points, error: gpsError } = useGpsTracking({
    workoutId: sessionId,
    exerciseId: vm.currentExercise?.id ?? '',
    enabled: isRunningExercise,
  });

  // Interval execution state
  const [currentIntervalIndex, setCurrentIntervalIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [elapsedDistanceKm, setElapsedDistanceKm] = useState(0);
  const [intervalCompleted, setIntervalCompleted] = useState(false);

  const currentInterval = intervals[currentIntervalIndex];

  // Auto-advance interval when time/distance target is met
  useEffect(() => {
    if (!currentInterval || intervalCompleted) return;

    let reached = false;
    if (currentInterval.workType === 'time') {
      reached = elapsedSeconds >= currentInterval.workValue;
    } else {
      reached = elapsedDistanceKm >= currentInterval.workValue;
    }

    if (reached) {
      setIntervalCompleted(true);
      if (currentIntervalIndex >= intervals.length - 1) {
        // Last interval done — let the screen finish normally
        return;
      }
      setCurrentIntervalIndex((i) => i + 1);
      setElapsedSeconds(0);
      setElapsedDistanceKm(0);
      setIntervalCompleted(false);
    }
  }, [
    currentInterval,
    currentIntervalIndex,
    elapsedSeconds,
    elapsedDistanceKm,
    intervalCompleted,
    intervals.length,
  ]);

  // Track elapsed time for time-based intervals
  useEffect(() => {
    if (!isTracking || !currentInterval || currentInterval.workType !== 'time') {
      return;
    }
    const t = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isTracking, currentInterval]);

  // Advance to next interval manually
  const handleAdvanceInterval = async () => {
    if (currentIntervalIndex >= intervals.length - 1) return;
    const current = intervals[currentIntervalIndex];
    try {
      await reportRunningProgress({
        workoutId,
        intervalIndex: currentIntervalIndex,
        elapsedSeconds,
        elapsedDistanceKm,
        completed: true,
      })
    } catch {
      // best-effort: never block interval advance on network failure
    }
    setCurrentIntervalIndex((i) => i + 1)
    setElapsedSeconds(0)
    setElapsedDistanceKm(0)
    setIntervalCompleted(false)
  }

  // Mark workout complete from interval tracker
  const handleCompleteFromIntervals = async () => {
    const current = intervals[currentIntervalIndex]
    try {
      await reportRunningProgress({
        workoutId,
        intervalIndex: currentIntervalIndex,
        elapsedSeconds,
        elapsedDistanceKm,
        completed: true,
      })
    } catch {
      // best-effort
    }
    vm.handleNext()
  }

  // Up-next exercises (next 1-2 exercises).
  const upcomingExercises = useMemo(
    () =>
      vm.exercises
        .slice(vm.currentExerciseIndex + 1, vm.currentExerciseIndex + 3)
        .map((ex) => mapToUpNextExercise(ex, vm.prescriptionByExerciseId.get(ex.id))),
    [vm.exercises, vm.currentExerciseIndex, vm.prescriptionByExerciseId],
  );

  return (
    <SafeAreaView style={styles.container}>
      <RecordingConsent onConsent={vm.handleConsentResponse} />
      <BadgeUnlockToast
        badgeName={vm.currentBadgeName}
        visible={vm.showBadgeToast}
        onDismiss={() => vm.setShowBadgeToast(false)}
      />
      <View style={styles.headerRow}>
        <ScreenHeader title={vm.title} onBack={() => navigation.goBack()} />
        <View style={styles.headerRight}>
          {isRunningExercise && (
            <View style={styles.gpsStatus}>
              <View style={[styles.gpsDot, { backgroundColor: isTracking ? '#15AAF2' : '#FF3B30' }]} />
              <Text style={styles.gpsText}>{isTracking ? 'GPS' : 'GPS OFF'}</Text>
            </View>
          )}
          {vm.streakCurrent > 0 && <StreakBadge count={vm.streakCurrent} />}
          {vm.outboxCount > 0 && (
            <PendingSyncBadge count={vm.outboxCount} accessibilityLabel={t.pendingSync} />
          )}
          {vm.hasConsent && vm.pendingCount > 0 && (
            <PendingSyncBadge count={vm.pendingCount} />
          )}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {vm.isLoading ? (
          <EmptyState variant="loading" message={t.loadingWorkout} />
        ) : vm.isError || !vm.data ? (
          <EmptyState variant="error" message={t.loadWorkoutError} onRetry={vm.refetch} />
        ) : !vm.currentExercise ? (
          <EmptyState variant="empty" message={t.noExercises} />
        ) : vm.completed ? (
          <CompletionSummary
            workoutName={vm.data.workout.contentName}
            durationText={formatDuration(vm.finalDuration)}
            statsText={interpolate(t.summaryStats, {
              a: String(vm.exercises.length),
              b: String(vm.totalSets),
            })}
            prs={vm.completedPrs}
            badgeIds={vm.badges.map((b) => b.badgeId)}
            showPrAnimation={vm.showPrAnimation}
            onPrAnimationComplete={() => vm.setShowPrAnimation(false)}
            labels={{
              completeLabel: t.workoutCompleteLabel,
              newPrsLabel: t.newPrsLabel,
              doneLabel: t.done,
            }}
            onDone={() => navigation.goBack()}
          />
        ) : (
          <>
            {vm.showsResume ? (
              <Pressable
                accessibilityRole="button"
                onPress={vm.handleResume}
                style={styles.resumeBanner}
              >
                <Text style={styles.resumeLabel}>{t.resumeLabel}</Text>
                <Text style={styles.resumeHint}>{t.resumeHint}</Text>
              </Pressable>
            ) : null}

            <ProgressBar progress={vm.computedProgress} />

            {vm.currentPrescription?.gpsRoute ? (
              <RunningRouteView
                key={`route-${vm.currentExercise.id}`}
                gpsRoute={vm.currentPrescription.gpsRoute}
                height={280}
                followUser
                workoutId={vm.data?.workout.id}
                exerciseId={vm.currentExercise.id}
              />
            ) : null}

            {isRunningExercise && intervals.length > 0 ? (
              <IntervalTracker
                intervals={intervals}
                currentIntervalIndex={currentIntervalIndex}
                elapsedSeconds={elapsedSeconds}
                elapsedDistanceKm={elapsedDistanceKm}
                onComplete={handleCompleteFromIntervals}
                onAdvance={handleAdvanceInterval}
                isOffRoute={false}
              />
            ) : null}

            <ExerciseCard
              name={vm.currentExercise.name}
              detail={
                vm.targetLabel +
                (vm.currentExercise.restSeconds
                  ? ` · ${vm.currentExercise.restSeconds}${t.restSuffix}`
                  : '')
              }
              whyText={vm.whyText}
              progressText={interpolate(t.setProgress, {
                a: String(vm.currentSetIndex + 1),
                b: String(vm.currentExercise.sets),
              })}
              viewDemoLabel={t.viewDemo}
              {...(isPlayableVideoUrl(vm.demoVideoUrl) ? { onViewDemo: () => vm.setDemoVisible(true) } : {})}
              verdict={vm.formVerdict}
            />

            {vm.aiActive ? (
              <AiWorkoutCta label={vm.aiTexts.trainWithAi} onPress={vm.handleOpenAiWorkout} />
            ) : null}

            {/* Form Analysis */}
            <FormAnalyzer
              score={vm.formScore}
              metrics={vm.formMetrics}
              feedback={vm.formFeedback}
            />

            {/* Rep Counter with form validation */}
            {!vm.isTimeMode ? (
              <RepCounter
                currentReps={vm.currentReps}
                targetReps={vm.targetReps}
                formScore={vm.formScore}
                formThreshold={FORM_SCORE_THRESHOLD}
                onIncrement={() => vm.setCurrentReps((r) => r + 1)}
                onDecrement={() => vm.setCurrentReps((r) => Math.max(0, r - 1))}
                isAutoCount
              />
            ) : null}

            {/* Weight Input */}
            {!vm.isBodyweight && !vm.isTimeMode ? (
              <WeightInput
                value={vm.weightValue}
                prescribedWeight={vm.currentPrescription?.weightKg}
                onChange={vm.setWeightValue}
              />
            ) : null}

            {/* Time/Seconds input for time mode */}
            {vm.isTimeMode ? (
              <SetInput
                value={vm.secInput}
                onChangeText={vm.setSecInput}
                placeholder="Segundos"
              />
            ) : null}

            {/* RIR Input */}
            <SetInput
              value={vm.rirInput}
              onChangeText={vm.setRirInput}
              placeholder="RIR"
              fixedWidth
            />

            <PrimaryButton
              label={vm.buttonLabel}
              onPress={vm.handleNext}
              disabled={vm.isLoggingSet}
            />

            {/* Up Next Preview */}
            <UpNextPreview exercises={upcomingExercises} />
          </>
        )}
      </ScrollView>
      {vm.restSecondsLeft != null ? (
        <RestOverlay
          secondsLeft={vm.restSecondsLeft}
          skipLabel={t.skipRest}
          onComplete={() => vm.setRestSecondsLeft(null)}
          onSkip={() => vm.setRestSecondsLeft(null)}
        />
      ) : null}
      {vm.demoVisible && vm.currentExercise && isPlayableVideoUrl(vm.demoVideoUrl) ? (
        <ExerciseDemoModal
          videoUrl={vm.demoVideoUrl}
          exerciseId={vm.currentExercise.id}
          exerciseName={vm.currentExercise.name}
          showAiCta={vm.aiActive}
          onClose={() => vm.setDemoVisible(false)}
          onRecordPress={vm.handleOpenAiWorkout}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: layout.pagePadding, paddingBottom: 120, gap: spacing.lg },
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
  gpsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  resumeBanner: {
    backgroundColor: `${colors.primary}1A`,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  resumeLabel: { ...typography.label, color: colors.primary },
  resumeHint: { ...typography.caption, color: colors.textSecondary },
});
