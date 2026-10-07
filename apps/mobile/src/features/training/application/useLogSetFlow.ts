import type { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { smartClient as apiClient } from '../../../infrastructure/api/client';
import { syncIfPossible } from '../../../infrastructure/health';
import type { UserBadge } from '../../gamification/domain/badgeService';
import {
  clearSessionResume,
  saveSessionResume,
  type SessionResume,
} from '../presentation/screens/executionResume';
import { enqueueSetOutbox, type OutboxStep } from './setOutbox';
import type {
  Advance,
  CompletedPr,
  Exercise,
  SessionLiveData,
  SetPayload,
} from './workoutExecutionTypes';

type LogWorkoutVars = {
  workoutDate: string;
  workoutType: string;
  durationMinutes: number;
  caloriesBurned: number;
};

type CheckBadgesVars = {
  totalWorkouts: number;
  totalPRs: number;
  feedInteractions: number;
};

export type LogSetFlowParams = {
  sessionId: string;
  exercises: Exercise[];
  currentExerciseIndex: number;
  currentSetIndex: number;
  durationSeconds: number;
  isLastExercise: boolean;
  currentExercise: Exercise | undefined;
  workoutName: string | undefined;
  completedPrs: CompletedPr[];
  logSetErrorTitle: string;
  logSetErrorBody: string;
  setCurrentSetIndex: Dispatch<SetStateAction<number>>;
  setCurrentExerciseIndex: Dispatch<SetStateAction<number>>;
  setCompletedPrs: (prs: CompletedPr[]) => void;
  setFinalDuration: Dispatch<SetStateAction<number>>;
  setCompleted: Dispatch<SetStateAction<boolean>>;
  setCurrentBadgeName: Dispatch<SetStateAction<string>>;
  setShowBadgeToast: Dispatch<SetStateAction<boolean>>;
  setRepsInput: Dispatch<SetStateAction<string>>;
  setSecInput: Dispatch<SetStateAction<string>>;
  setRirInput: Dispatch<SetStateAction<string>>;
  setCurrentReps: Dispatch<SetStateAction<number>>;
  setRestSecondsLeft: Dispatch<SetStateAction<number | null>>;
  syncPending: () => Promise<void>;
  logWorkoutMutation: { mutate: (vars: LogWorkoutVars) => void };
  checkBadgesMutation: {
    mutate: (
      vars: CheckBadgesVars,
      options?: { onSuccess?: (newBadges: UserBadge[]) => void },
    ) => void;
  };
};

/**
 * The flow is POST set → POST progress → POST complete. On ANY failure
 * (network down, 5xx, 4xx) the unsent remainder is queued in the offline
 * outbox as one ordered item and the UI advances optimistically, so a
 * logged set is never lost.
 */
export function useLogSetFlow(p: LogSetFlowParams) {
  const collectPrs = async (): Promise<CompletedPr[]> => {
    try {
      const { data } = await apiClient.get(`/athlete/sessions/${p.sessionId}`);
      const live = data as SessionLiveData;
      return (live.exercises ?? [])
        .filter((e) => e.pr)
        .map((e) => ({ name: e.name, est: e.pr!.est }));
    } catch {
      return [];
    }
  };

  return useMutation({
    mutationFn: async (
      payload: SetPayload,
    ): Promise<{ advance: Advance; resume: SessionResume | null; offline: boolean }> => {
      const exercise = p.exercises[p.currentExerciseIndex] as Exercise;
      const hasMoreSets = p.currentSetIndex < exercise.sets - 1;

      const steps: OutboxStep[] = [
        {
          path: `/athlete/sessions/${p.sessionId}/sets`,
          body: {
            exerciseId: exercise.id,
            setIndex: p.currentSetIndex,
            weightKg: payload.weightKg,
            reps: payload.reps,
            sec: payload.sec,
            rir: payload.rir,
          },
        },
      ];
      if (!hasMoreSets) {
        steps.push({
          path: `/athlete/sessions/${p.sessionId}/progress`,
          body: {
            currentExerciseIndex: p.currentExerciseIndex + 1,
            durationSeconds: p.durationSeconds,
          },
        });
      }

      let offline = false;
      for (let i = 0; i < steps.length; i++) {
        try {
          await apiClient.post(steps[i].path, steps[i].body);
        } catch (err) {
          console.error('[WorkoutExecution] set flow failed; queued for sync:', err);
          enqueueSetOutbox(steps.slice(i));
          offline = true;
          break;
        }
      }

      if (hasMoreSets) {
        return {
          advance: 'next-set',
          offline,
          resume: {
            sessionId: p.sessionId,
            currentExerciseIndex: p.currentExerciseIndex,
            currentSetIndex: p.currentSetIndex + 1,
          },
        };
      }

      if (p.isLastExercise) {
        // `complete` only fires once `progress` is confirmed; offline it is
        // enqueued as a follow-up item so flush preserves the order.
        const prs = offline ? [] : await collectPrs();
        if (!offline) {
          try {
            await apiClient.post(`/athlete/sessions/${p.sessionId}/complete`, {});
          } catch (err) {
            console.error('[WorkoutExecution] complete failed; queued for sync:', err);
            enqueueSetOutbox([{ path: `/athlete/sessions/${p.sessionId}/complete`, body: {} }]);
            offline = true;
          }
        }
        p.setCompletedPrs(prs);
        void syncIfPossible().catch(() => undefined);
        return { advance: 'done', resume: null, offline };
      }

      return {
        advance: 'next-exercise',
        offline,
        resume: {
          sessionId: p.sessionId,
          currentExerciseIndex: p.currentExerciseIndex + 1,
          currentSetIndex: 0,
        },
      };
    },
    onSuccess: ({ advance, resume: nextResume }) => {
      if (advance === 'next-set') {
        p.setCurrentSetIndex((i) => i + 1);
      } else if (advance === 'next-exercise') {
        p.setCurrentExerciseIndex((i) => i + 1);
        p.setCurrentSetIndex(0);

        // Check for streak milestone badge
        const newExerciseIndex = p.currentExerciseIndex + 1;
        if (newExerciseIndex === Math.floor(p.exercises.length / 2)) {
          p.setCurrentBadgeName('Medio Camino');
          p.setShowBadgeToast(true);
        }
      } else {
        p.setFinalDuration(p.durationSeconds);
        p.setCompleted(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Sync form recordings to server (background)
        p.syncPending().catch(() => {
          // Sync failed — videos remain local for next app open
        });

        // Log workout to gamification API
        const today = new Date().toISOString().split('T')[0];
        p.logWorkoutMutation.mutate({
          workoutDate: today,
          workoutType: p.workoutName ?? 'workout',
          durationMinutes: Math.round(p.durationSeconds / 60),
          caloriesBurned: 0,
        });

        // Check for new badges
        p.checkBadgesMutation.mutate(
          {
            totalWorkouts: 1,
            totalPRs: p.completedPrs.length,
            feedInteractions: 0,
          },
          {
            onSuccess: (newBadges) => {
              if (newBadges.length > 0) {
                p.setCurrentBadgeName(newBadges[0].badgeId);
                p.setShowBadgeToast(true);
              }
            },
          },
        );

        // Unlock workout completion badge
        p.setCurrentBadgeName('Entrenamiento Completado');
        p.setShowBadgeToast(true);
      }

      if (nextResume) {
        saveSessionResume(
          nextResume.sessionId, nextResume.currentExerciseIndex, nextResume.currentSetIndex,
        );
      } else {
        clearSessionResume();
      }

      p.setRepsInput('');
      p.setSecInput('');
      p.setRirInput('');
      p.setCurrentReps(0);

      // Auto-start the rest timer after a logged set (offline or not).
      if (advance !== 'done' && (p.currentExercise?.restSeconds ?? 0) > 0) {
        p.setRestSecondsLeft(p.currentExercise?.restSeconds ?? null);
      }
    },
    onError: (err) => {
      console.error('Failed to log set:', err);
      Alert.alert(p.logSetErrorTitle, p.logSetErrorBody);
    },
  });
}
