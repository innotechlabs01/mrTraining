import { useCallback, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SessionRep {
  counted: boolean;
  quality: 'GOOD' | 'REGULAR' | 'BAD' | 'UNKNOWN';
  score: number;
  romKneeDeg: number;
  durationMs: number;
  velocityDegPerSec: number;
}

export type VelocityTrend = 'up' | 'down' | 'flat';

export interface AiSessionSummary {
  exercise: string;
  target: number;
  completed: number;
  rejected: number;
  avgForm: number;
  bestForm: number;
  avgRom: number;
  avgTempoMs: number;
  velocityTrend: VelocityTrend;
  failureProximity: number;
}

interface Input {
  exercise: string;
  target: number;
  reps: SessionRep[];
  failureProximity: number;
}

const round = (n: number): number => Math.round(n);

export function computeAiSessionSummary(input: Input): AiSessionSummary {
  const counted = input.reps.filter((r) => r.counted);
  const rejected = input.reps.filter((r) => !r.counted).length;
  const avg = (xs: number[]): number => (xs.length === 0 ? 0 : round(xs.reduce((a, b) => a + b, 0) / xs.length));
  const best = (xs: number[]): number => (xs.length === 0 ? 0 : Math.max(...xs));

  let trend: VelocityTrend = 'flat';
  const velocities = counted.map((r) => r.velocityDegPerSec);
  if (velocities.length >= 4) {
    const half = Math.floor(velocities.length / 2);
    const first = avg(velocities.slice(0, half));
    const last = avg(velocities.slice(half));
    const delta = last - first;
    trend = Math.abs(delta) < 5 ? 'flat' : delta > 0 ? 'up' : 'down';
  }

  return {
    exercise: input.exercise,
    target: input.target,
    completed: counted.length,
    rejected,
    avgForm: avg(counted.map((r) => r.score)),
    bestForm: best(counted.map((r) => r.score)),
    avgRom: avg(counted.map((r) => r.romKneeDeg)),
    avgTempoMs: avg(counted.map((r) => r.durationMs)),
    velocityTrend: trend,
    failureProximity: input.failureProximity,
  };
}

const STORAGE_KEY = 'mr.ai-session-summary';

export function useSessionSummary(exercise: string, target: number): {
  summary: AiSessionSummary;
  completed: boolean;
  track: (rep: SessionRep) => void;
  setFailureProximity: (p: number) => void;
  reset: () => void;
} {
  const repsRef = useRef<SessionRep[]>([]);
  const failureRef = useRef(0);
  const [reps, setReps] = useState<SessionRep[]>([]);
  const [failure, setFailure] = useState(0);
  const [completed, setCompleted] = useState(false);

  const track = useCallback((rep: SessionRep) => {
    repsRef.current = [...repsRef.current, rep];
    setReps(repsRef.current);
  }, []);

  const setFailureProximity = useCallback((p: number) => {
    failureRef.current = p;
    setFailure(p);
  }, []);

  const reset = useCallback(() => {
    repsRef.current = [];
    failureRef.current = 0;
    setReps([]);
    setFailure(0);
    setCompleted(false);
  }, []);

  const summary = useMemo(
    () => computeAiSessionSummary({ exercise, target, reps, failureProximity: failure }),
    [exercise, target, reps, failure],
  );

  const done = completed || summary.completed >= target;

  return { summary, completed: done, track, setFailureProximity, reset };
}

export async function persistSessionSummary(summary: AiSessionSummary): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(summary));
  } catch {
    // persistence is best-effort; a failed write must not break the workout
  }
}

export async function readStoredSessionSummary(): Promise<AiSessionSummary | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AiSessionSummary) : null;
  } catch {
    return null;
  }
}