import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, AppState, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, layout, spacing, radius, typography } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { ProgressBar } from '../../../../shared/components/ui/ProgressBar';
import { RecordingConsent } from '../../../training/presentation/components/RecordingConsent';
import { BadgeUnlockToast } from '../../../../shared/components/gamification/BadgeUnlockToast';
import { StreakBadge } from '../../../../shared/components/gamification/StreakBadge';
import { FormAnalyzer } from '../../../training/presentation/components/FormAnalyzer';
import { RepCounter } from '../../../training/presentation/components/RepCounter';
import { WeightInput } from '../../../training/presentation/components/WeightInput';
import { SetInput } from '../../../training/presentation/components/execution/SetInput';
import { ExerciseCard } from '../../../training/presentation/components/execution/ExerciseCard';
import { UpNextPreview } from '../../../training/presentation/components/UpNextPreview';
import { AiWorkoutCta } from '../../../training/presentation/components/execution/AiWorkoutCta';
import { PendingSyncBadge } from '../../../training/presentation/components/execution/PendingSyncBadge';
import { RestOverlay } from '../../../training/presentation/components/execution/RestOverlay';
import { CompletionSummary } from '../../../training/presentation/components/execution/CompletionSummary';
import { useWorkoutExecution } from '../../../training/application/useWorkoutExecution';
import { formatDuration, FORM_SCORE_THRESHOLD, interpolate } from '../../../training/application/workoutExecutionTypes';
import { texts } from '../../../../shared/i18n/texts';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ChallengeExecutionRoute = RouteProp<RootStackParamList, 'ChallengeExecution'>;

export function ChallengeExecutionScreen({ route, navigation }: { route: ChallengeExecutionRoute; navigation: Nav }) {
  const { challengeId, attemptId } = route.params;
  const queryClient = useQueryClient();
  const t = texts.screens.challengeExecution;

  // App state tracking for background detection
  const [appState, setAppState] = useState(AppState.currentState);
  const [backgroundedDuringChallenge, setBackgroundedDuringChallenge] = useState(false);
  const [challengeStarted, setChallengeStarted] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState === 'active' && nextState !== 'active' && challengeStarted) {
        // App went to background during challenge
        setBackgroundedDuringChallenge(true);
      }
      setAppState(nextState);
    });
    return () => subscription.remove();
  }, [appState, challengeStarted]);

  // Mock challenge execution VM - in reality this would fetch challenge-specific data
  const vm = useWorkoutExecution({
    sessionId: attemptId, // Using attemptId as sessionId for challenge
    workoutId: challengeId,
    navigation,
  });

  const handleFinishChallenge = async () => {
    if (backgroundedDuringChallenge) {
      Alert.alert(
        t.backgroundLostTitle,
        interpolate(t.backgroundLostBody, { a: String((vm as any).totalAttempts - 1) }),
        [
          { text: t.continueAnyway, onPress: () => submitChallenge() },
          { text: texts.common.cancel, style: 'cancel' },
        ]
      );
    } else {
      submitChallenge();
    }
  };

  const submitChallenge = async () => {
    // Save form metrics if consent given and score exists
    if (vm.hasConsent && vm.formScore > 0) {
      await vm.saveMetrics(
        vm.currentExercise?.id ?? 'challenge',
        vm.currentExercise?.name ?? 'Challenge Exercise',
        challengeId,
        vm.formScore,
        vm.formMetrics,
      );
    }

    // Submit attempt with challenge metrics
    try {
      await apiClient.post(`/athlete/challenges/attempts/${attemptId}/submit`, {
        form_score: vm.formScore,
        depth_score: vm.formMetrics.depth ?? 0,
        alignment_score: vm.formMetrics.alignment ?? 0,
        tempo_score: vm.formMetrics.tempo ?? 0,
        sets_completed: vm.currentSetIndex + 1,
        reps_completed: vm.currentReps,
        total_volume: vm.weightValue * vm.currentReps * (vm.currentSetIndex + 1),
        notes: 'Challenge attempt',
      });

      await queryClient.invalidateQueries({ queryKey: ['challenge', challengeId] });
      await queryClient.invalidateQueries({ queryKey: ['athlete-challenges'] });

      navigation.navigate('ChallengeComplete' as never, { challengeId, attemptId });
    } catch (err) {
      console.error('Challenge submit error:', err);
      Alert.alert(t.submitErrorTitle, t.submitErrorBody);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <RecordingConsent onConsent={vm.handleConsentResponse} />
      <BadgeUnlockToast
        badgeName={vm.currentBadgeName}
        visible={vm.showBadgeToast}
        onDismiss={() => vm.setShowBadgeToast(false)}
      />
      <View style={styles.headerRow}>
        <ScreenHeader title={t.challengeExecutionTitle} onBack={() => {
          if (challengeStarted) {
            Alert.alert(t.leaveChallengeTitle, t.leaveChallengeBody, [
              { text: texts.common.cancel, style: 'cancel' },
              { text: t.leaveAnyway, onPress: () => navigation.goBack() },
            ]);
          } else {
            navigation.goBack();
          }
        }} />
        <View style={styles.headerRight}>
          {vm.streakCurrent > 0 && <StreakBadge count={vm.streakCurrent} />}
          {vm.outboxCount > 0 && (
            <PendingSyncBadge count={vm.outboxCount} accessibilityLabel={(t as any).pendingSync} />
          )}
          {vm.hasConsent && vm.pendingCount > 0 && (
            <PendingSyncBadge count={vm.pendingCount} />
          )}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {vm.isLoading ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText}>{t.loadingChallenge}</Text>
          </View>
        ) : vm.isError || !vm.data ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.errorText}>{t.loadError}</Text>
            <PrimaryButton label={texts.common.retry} onPress={vm.refetch} variant="outline" />
          </View>
        ) : !vm.currentExercise ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.errorText}>{t.noExercises}</Text>
          </View>
        ) : vm.completed ? (
          <CompletionSummary
            workoutName={vm.data?.workout?.contentName ?? 'Desafío'}
            durationText={formatDuration(vm.finalDuration)}
            statsText={interpolate(t.summaryStats, { a: String(vm.exercises.length), b: String(vm.totalSets) })}
            prs={vm.completedPrs}
            badgeIds={vm.badges.map((b) => b.badgeId)}
            showPrAnimation={vm.showPrAnimation}
            onPrAnimationComplete={() => vm.setShowPrAnimation(false)}
            labels={{
              completeLabel: t.challengeCompleteLabel,
              newPrsLabel: t.newPrsLabel,
              doneLabel: texts.common.continue,
            }}
            onDone={() => navigation.goBack()}
          />
        ) : (
          <>
            {!challengeStarted && (
              <PrimaryButton
                label={t.startChallenge}
                onPress={() => setChallengeStarted(true)}
                style={styles.startButton}
              />
            )}

            {challengeStarted && (
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

                {/* Background warning banner */}
                {backgroundedDuringChallenge && (
                  <View style={styles.backgroundWarning}>
                    <Text style={styles.warningText}>
                      {t.backgroundWarning}
                    </Text>
                    <Text style={styles.warningDetail}>
                      {interpolate(t.attemptsRemaining, { a: String((vm as any).totalAttempts - 1) })}
                    </Text>
                  </View>
                )}

                <PrimaryButton
                  label={vm.buttonLabel}
                  onPress={handleFinishChallenge}
                  disabled={vm.isLoggingSet}
                />

                {/* Up Next Preview */}
                <UpNextPreview exercises={[]} />
              </>
            )}
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{vm.currentExercise.name}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={texts.common.close}
                onPress={() => vm.setDemoVisible(false)}
                style={styles.modalClose}
                hitSlop={8}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.modalVideo}>
              <Text style={styles.modalVideoText}>{t.modalVideoPlaceholder}</Text>
            </View>
          </View>
        </View>
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
  startButton: {
    marginTop: spacing.lg,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: { ...typography.body, color: colors.textSecondary },
  errorText: { ...typography.body, color: colors.error },
  resumeBanner: {
    backgroundColor: `${colors.primary}1A`,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  resumeLabel: { ...typography.label, color: colors.primary },
  resumeHint: { ...typography.caption, color: colors.textSecondary },
  backgroundWarning: {
    backgroundColor: `${colors.warning}1A`,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
    gap: spacing.xs,
  },
  warningText: { ...typography.label, color: colors.warning },
  warningDetail: { ...typography.caption, color: colors.textSecondary },
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.h3, color: colors.text },
  modalClose: { padding: spacing.xs },
  modalCloseText: { ...typography.h3, color: colors.textSecondary },
  modalVideo: { aspectRatio: 16 / 9, backgroundColor: '#000' },
  modalVideoText: { color: colors.textSecondary, textAlign: 'center', marginTop: '40%' },
});