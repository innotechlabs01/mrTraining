import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing, typography } from '../../../../shared/theme/tokens';
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
import { PendingSyncBadge } from '../components/execution/PendingSyncBadge';
import { RestOverlay } from '../components/execution/RestOverlay';
import { SetInput } from '../components/execution/SetInput';

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
              {...(vm.demoVideoUrl ? { onViewDemo: () => vm.setDemoVisible(true) } : {})}
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
      {vm.demoVisible && vm.currentExercise && vm.demoVideoUrl ? (
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
  resumeBanner: {
    backgroundColor: `${colors.primary}1A`,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  resumeLabel: { ...typography.label, color: colors.primary },
  resumeHint: { ...typography.caption, color: colors.textSecondary },
});
