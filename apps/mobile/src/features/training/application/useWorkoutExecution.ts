import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/Navigation';
import { clearSessionResume } from '../presentation/screens/executionResume';
import { texts } from '../../../shared/i18n/texts';
import { shouldUseAiFor } from '../presentation/screens/aiWorkoutTrigger';
import { definitionFor } from '../../ai/application/definitions';
import { useBadges, useCheckBadges, useLogWorkout, useStreak } from '../../gamification/hooks';
import { useExecutionForm } from './useExecutionForm';
import { useLogSetFlow } from './useLogSetFlow';
import { useWorkoutExecutionData } from './useWorkoutExecutionData';
import {
  toNumberOrUndefined,
  type CompletedPr,
  type SetPayload,
} from './workoutExecutionTypes';

type Navigation = NativeStackScreenProps<RootStackParamList, 'WorkoutExecution'>['navigation'];

export type UseWorkoutExecutionParams = {
  sessionId: string;
  workoutId: string;
  navigation: Navigation;
};

/**
 * Workout execution view-model: composes server data, the per-set entry form,
 * and the set-logging flow into a screen-ready API.
 */
export function useWorkoutExecution({ sessionId, workoutId, navigation }: UseWorkoutExecutionParams) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [completedPrs, setCompletedPrs] = useState<CompletedPr[]>([]);
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [demoVisible, setDemoVisible] = useState(false);

  const d = useWorkoutExecutionData({
    sessionId,
    workoutId,
    currentExerciseIndex,
    currentSetIndex,
    completed,
  });

  const f = useExecutionForm({
    currentExerciseIndex,
    currentExercise: d.currentExercise,
    currentPrescription: d.currentPrescription,
  });

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

  // Local gamification state for UI
  const [showBadgeToast, setShowBadgeToast] = useState(false);
  const [currentBadgeName, setCurrentBadgeName] = useState('');
  const [showPrAnimation, setShowPrAnimation] = useState(false);

  const logSetMutation = useLogSetFlow({
    sessionId,
    exercises: d.exercises,
    currentExerciseIndex,
    currentSetIndex,
    durationSeconds: d.durationSeconds,
    isLastExercise: d.isLastExercise,
    currentExercise: d.currentExercise,
    workoutName: d.data?.workout?.contentName,
    completedPrs,
    logSetErrorTitle: d.t.logSetErrorTitle,
    logSetErrorBody: d.t.logSetErrorBody,
    setCurrentSetIndex,
    setCurrentExerciseIndex,
    setCompletedPrs,
    setFinalDuration,
    setCompleted,
    setCurrentBadgeName,
    setShowBadgeToast,
    setRepsInput: f.setRepsInput,
    setSecInput: f.setSecInput,
    setRirInput: f.setRirInput,
    setCurrentReps: f.setCurrentReps,
    setRestSecondsLeft,
    syncPending: f.syncPending,
    logWorkoutMutation,
    checkBadgesMutation,
  });

  const aiActive = d.currentExercise ? shouldUseAiFor(d.currentExercise) : false;
  const aiExerciseId =
    aiActive && d.currentExercise
      ? definitionFor(d.currentExercise.name.trim().toLowerCase())?.id ?? null
      : null;
  const aiTarget = d.currentPrescription?.reps ?? d.currentExercise?.reps ?? 0;

  const handleOpenAiWorkout = () => {
    if (!aiExerciseId) return;
    setDemoVisible(false);
    navigation.navigate('AiWorkout', {
      sessionId,
      workoutId,
      exerciseId: aiExerciseId,
      target: aiTarget,
      exerciseDbId: d.currentExercise?.id ?? aiExerciseId,
    });
  };

  // Demo video + form verdict surfaces for the current exercise.
  const demoVideoUrl = d.currentExercise?.videoUrl ?? null;
  const formVerdict =
    f.formScore > 0 && f.formQuality ? { quality: f.formQuality, score: f.formScore } : null;

  // Trigger PR celebration when workout completes with PRs
  useEffect(() => {
    if (completed && completedPrs.length > 0) {
      setShowPrAnimation(true);
    }
  }, [completed, completedPrs]);

  const handleNext = async () => {
    if (!d.currentExercise) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Save form metrics if consent given and score exists
    if (f.hasConsent && f.formScore > 0) {
      await f.saveMetrics(
        d.currentExercise.id,
        d.currentExercise.name,
        workoutId,
        f.formScore,
        f.formMetrics,
      );
    }

    const payload: SetPayload = {};
    const sec = toNumberOrUndefined(f.secInput);
    const rir = toNumberOrUndefined(f.rirInput);
    if (!d.isBodyweight && !d.isTimeMode) payload.weightKg = f.weightValue;
    if (!d.isTimeMode) payload.reps = f.currentReps || toNumberOrUndefined(f.repsInput);
    if (d.isTimeMode && sec !== undefined) payload.sec = sec;
    if (!d.isTimeMode && sec !== undefined) payload.sec = sec;
    if (rir !== undefined) payload.rir = rir;
    logSetMutation.mutate(payload);
  };

  const handleResume = () => {
    if (!d.resume) return;
    const maxIndex = Math.max(0, d.exercises.length - 1);
    setCurrentExerciseIndex(Math.min(d.resume.currentExerciseIndex, maxIndex));
    setCurrentSetIndex(d.resume.currentSetIndex);
    d.setResume(null);
    clearSessionResume();
  };

  const buttonLabel = d.isLastExercise && d.isLastSet ? d.t.finish : d.t.completeSet;

  return {
    // position within the workout
    currentExerciseIndex, currentSetIndex,
    // data layer
    ...d,
    // entry form + form analysis
    ...f,
    // AI wiring
    aiActive, handleOpenAiWorkout,
    aiTexts: texts.screens.aiWorkout,
    // demo video modal
    demoVisible, setDemoVisible, demoVideoUrl,
    // AI form verdict for the current exercise
    formVerdict,
    // completion
    completed, completedPrs, finalDuration,
    badges, showPrAnimation, setShowPrAnimation,
    // header
    streakCurrent: streakData?.current ?? 0,
    // badge toast
    showBadgeToast, currentBadgeName, setShowBadgeToast,
    // resume
    handleResume,
    // rest overlay
    restSecondsLeft, setRestSecondsLeft,
    // submit
    buttonLabel, handleNext,
    isLoggingSet: logSetMutation.isPending,
  };
}

export type WorkoutExecutionViewModel = ReturnType<typeof useWorkoutExecution>;
