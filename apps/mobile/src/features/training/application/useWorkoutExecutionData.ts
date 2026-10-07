import { useEffect, useMemo, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../infrastructure/api/client';
import { texts } from '../../../shared/i18n/texts';
import { getSessionResume, type SessionResume } from '../presentation/screens/executionResume';
import {
  flushSetOutbox,
  getSetOutboxCount,
  subscribeSetOutbox,
} from './setOutbox';
import {
  formatWhy,
  type Exercise,
  type PrescriptionData,
  type WorkoutDetailData,
} from './workoutExecutionTypes';

export type WorkoutExecutionDataParams = {
  sessionId: string;
  workoutId: string;
  currentExerciseIndex: number;
  currentSetIndex: number;
  completed: boolean;
};

/** Server data, resume buffer, outbox mirroring, and derived execution state. */
export function useWorkoutExecutionData({
  sessionId,
  workoutId,
  currentExerciseIndex,
  currentSetIndex,
  completed,
}: WorkoutExecutionDataParams) {
  const t = texts.screens.workoutExecution;

  const [durationSeconds, setDurationSeconds] = useState(0);
  const [resume, setResume] = useState<SessionResume | null>(null);
  const [outboxCount, setOutboxCount] = useState(() => getSetOutboxCount());

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

  const exercises = useMemo(() => data?.exercises ?? [], [data]);
  const currentExercise = exercises[currentExerciseIndex] as Exercise | undefined;
  const prescriptionByExerciseId = useMemo(
    () => new Map((prescription?.prescriptions ?? []).map((p) => [p.exerciseId, p])),
    [prescription],
  );
  const currentPrescription = useMemo(
    () => (currentExercise ? prescriptionByExerciseId.get(currentExercise.id) : undefined),
    [currentExercise, prescriptionByExerciseId],
  );

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

  // Offline set outbox: flush on mount, on reconnect, and mirror its size so the
  // header can show a non-blocking "pending sync" badge.
  useEffect(() => {
    const flush = () =>
      flushSetOutbox((path, body) => apiClient.post(path, body)).then(() => undefined);
    void flush();
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected) void flush();
    });
    const unsubscribeOutbox = subscribeSetOutbox(setOutboxCount);
    return () => {
      unsubscribeNet();
      unsubscribeOutbox();
    };
  }, []);

  // Load any persisted resume buffer for this session.
  useEffect(() => {
    let active = true;
    getSessionResume().then((r) => {
      if (active) setResume(r);
    });
    return () => { active = false; };
  }, []);

  const showsResume =
    !!resume &&
    resume.sessionId === sessionId &&
    (resume.currentExerciseIndex > 0 || resume.currentSetIndex > 0);

  const totalSets = useMemo(
    () => exercises.reduce((sum, ex) => sum + ex.sets, 0),
    [exercises],
  );
  const setsSinceStart = useMemo(
    () => exercises.slice(0, currentExerciseIndex).reduce((sum, ex) => sum + ex.sets, 0),
    [exercises, currentExerciseIndex],
  );
  const computedProgress =
    totalSets > 0 ? (setsSinceStart + currentSetIndex) / totalSets : 0;

  const isLastExercise = currentExerciseIndex >= exercises.length - 1;
  const isLastSet = currentSetIndex >= (currentExercise?.sets ?? 0) - 1;

  const targetReps = currentPrescription?.reps ?? currentExercise?.reps ?? 0;
  const whyText = formatWhy(currentPrescription?.why);
  const targetLabel = useMemo(
    () =>
      isTimeMode
        ? `${currentPrescription?.sec ?? currentExercise?.sec ?? 0}s por serie`
        : [
            `${currentExercise?.sets ?? 0} × ${currentPrescription?.reps ?? currentExercise?.reps}`,
            isBodyweight
              ? ''
              : `@ ${currentPrescription?.weightKg ?? currentExercise?.weightKg ?? 0} kg`,
            currentExercise?.perSide ? '(por lado)' : '',
          ]
            .filter(Boolean)
            .join(' '),
    [isTimeMode, currentPrescription, currentExercise, isBodyweight],
  );

  const title = completed
    ? (data?.workout.contentName ?? 'Workout')
    : (currentExercise?.name ?? 'Workout');

  return {
    t,
    data, isLoading, isError, refetch,
    exercises, currentExercise, currentPrescription, prescriptionByExerciseId,
    durationSeconds,
    resume, setResume,
    outboxCount,
    showsResume, totalSets, computedProgress,
    isLastExercise, isLastSet,
    isTimeMode, isBodyweight,
    targetReps, whyText, targetLabel, title,
  };
}
