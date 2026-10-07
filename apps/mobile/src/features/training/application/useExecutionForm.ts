import { useEffect, useState } from 'react';
import type { ScoredQuality } from '../../ai/application/FormEngine';
import type { FormMetrics } from '../presentation/components/FormAnalyzer';
import { useFormRecording } from '../hooks/useFormRecording';
import {
  takeFormSessionResult,
  useFormSessionStore,
} from './formSessionStore';
import {
  DEFAULT_FORM_METRICS,
  type Exercise,
  type PrescriptionItem,
} from './workoutExecutionTypes';

export type ExecutionFormParams = {
  currentExerciseIndex: number;
  currentExercise: Exercise | undefined;
  currentPrescription: PrescriptionItem | undefined;
};

/** Per-set entry form state: weight/reps/time/RIR inputs plus form-analysis state. */
export function useExecutionForm({
  currentExerciseIndex,
  currentExercise,
  currentPrescription,
}: ExecutionFormParams) {
  const [weightValue, setWeightValue] = useState(0);
  const [repsInput, setRepsInput] = useState('');
  const [secInput, setSecInput] = useState('');
  const [rirInput, setRirInput] = useState('');
  const [currentReps, setCurrentReps] = useState(0);
  const [formScore, setFormScore] = useState(0);
  const [formMetrics, setFormMetrics] = useState<FormMetrics>(DEFAULT_FORM_METRICS);
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  const [formQuality, setFormQuality] = useState<ScoredQuality | null>(null);

  // Form recording hook — collects metrics with consent
  const {
    hasConsent,
    pendingCount,
    handleConsentResponse,
    saveMetrics,
    syncPending,
  } = useFormRecording();

  // Reset form analysis when exercise changes.
  useEffect(() => {
    setFormScore(0);
    setFormMetrics(DEFAULT_FORM_METRICS);
    setFormFeedback(null);
    setFormQuality(null);
    setCurrentReps(0);
  }, [currentExerciseIndex]);

  // Consume a pending AI form-check result for the current exercise. This revives
  // the metrics-save path in handleNext (score > 0) and feeds the verdict badge.
  const pendingResult = useFormSessionStore((s) => s.lastResult);
  useEffect(() => {
    if (!currentExercise || !pendingResult) return;
    const result = takeFormSessionResult(currentExercise.id);
    if (!result) return;
    setFormScore(result.score);
    setFormMetrics(result.metrics);
    setFormQuality(result.quality);
    setFormFeedback(null);
  }, [currentExercise, pendingResult]);

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

  return {
    weightValue, setWeightValue,
    repsInput, setRepsInput,
    secInput, setSecInput,
    rirInput, setRirInput,
    currentReps, setCurrentReps,
    formScore, formMetrics, formFeedback, formQuality,
    hasConsent, pendingCount, handleConsentResponse,
    saveMetrics, syncPending,
  };
}
