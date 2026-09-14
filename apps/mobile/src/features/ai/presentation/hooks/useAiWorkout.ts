import { useCallback, useEffect, useRef, useState } from 'react';
import * as Battery from 'expo-battery';
import { FrameScheduler } from '../../application/FrameScheduler';
import { prepare, type CameraCheck } from '../../application/CameraPreparationEngine';
import { poseFromFrame } from '../../infrastructure/camera/poseFrameSource';
import { readThermalState } from '../../infrastructure/device/thermal';
import type { PoseRuntime } from '../../infrastructure/pose/PoseRuntime';
import { RepEngine } from '../../application/RepEngine';
import { FormEngine } from '../../application/FormEngine';
import { FatigueEngine } from '../../application/FatigueEngine';
import { CoachingEngine } from '../../application/CoachingEngine';
import { BatteryManager } from '../../application/BatteryManager';
import { ThermalManager } from '../../application/ThermalManager';
import { compute } from '../../application/MovementEngine';
import { definitionFor } from '../../application/definitions';
import type { Pose, LandmarkFrame } from '../../domain/Landmark';
import type { RepQuality, CameraPositionStatus } from '../../domain/RepTypes';
import { speak } from '../voice';
import { useSessionSummary, persistSessionSummary, type SessionRep } from './useSessionSummary';

export interface DebugInfo {
  fps: number;
  aiFps: number;
  inferenceLatencyMs: number;
  model: string;
  modelVersion: string;
  landmarks: number;
  confidence: number;
  spread: number;
  framing: string;
  battery: number;
  temperature: string;
  exercise: string;
  phase: string;
  rom: number;
  velocity: number;
  tempo: number;
  reps: number;
  repQuality: RepQuality;
  form: number;
  failure: number;
}

interface AiWorkoutState {
  status: CameraPositionStatus;
  hint: string | null;
  repCount: number;
  target: number;
  quality: RepQuality | null;
  isCounting: boolean;
  debug: DebugInfo;
}

function maxVisibility(pose: Pose): number {
  return pose.landmarks.reduce((m, l) => (l.visibility > m ? l.visibility : m), 0);
}

export function useAiWorkout(
  exerciseId: string,
  target: number,
  runtime: PoseRuntime,
): AiWorkoutState & {
  onFrame: (frame: unknown, nowMs: number) => void;
  startCountdown: () => void;
  stop: () => void;
  sessionCompleted: boolean;
  summary: ReturnType<typeof useSessionSummary>['summary'];
} {
  const def = definitionFor(exerciseId) ?? definitionFor('squat')!;
  const [status, setStatus] = useState<CameraPositionStatus>('POSITION_INVALID');
  const [hint, setHint] = useState<string | null>(null);
  const [repCount, setRepCount] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const [quality, setQuality] = useState<RepQuality | null>(null);
  const session = useSessionSummary(def.id, target);

  const eng = useRef({
    scheduler: new FrameScheduler(12),
    rep: new RepEngine(),
    form: new FormEngine(),
    fatigue: new FatigueEngine(),
    coach: new CoachingEngine(),
    battery: new BatteryManager(),
    thermal: new ThermalManager(),
  }).current;

  const isCountingRef = useRef(isCounting);
  isCountingRef.current = isCounting;
  const formScoreRef = useRef(50);
  const statsRef = useRef({ js: 0, ai: 0, winStart: Date.now(), tempo: 0, latency: 0 });

  const [debug, setDebug] = useState<DebugInfo>({
    fps: 0,
    aiFps: 0,
    inferenceLatencyMs: 0,
    model: 'MediaPipe',
    modelVersion: '—',
    landmarks: 0,
    confidence: 0,
    spread: 0,
    framing: 'POSITION_INVALID',
    battery: 0,
    temperature: 'nominal',
    exercise: def.id,
    phase: 'IDLE',
    rom: 0,
    velocity: 0,
    tempo: 0,
    reps: 0,
    repQuality: 'UNKNOWN',
    form: 0,
    failure: 0,
  });

  useEffect(() => {
    let alive = true;
    const sample = async (): Promise<void> => {
      const level = await Battery.getBatteryLevelAsync();
      const state = await Battery.getBatteryStateAsync();
      const charging = state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;
      const thermal = await readThermalState();
      if (!alive) return;
      eng.battery.setLevel(Math.round(level * 100), charging);
      eng.thermal.setThermal(thermal);
      eng.scheduler.setTargetFps(Math.min(eng.battery.targetFps(), eng.thermal.targetFps()));
      setDebug((d) => ({ ...d, battery: Math.round(level * 100), temperature: thermal }));
    };
    void sample();
    const id = setInterval(() => void sample(), 2000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [eng]);

  const startCountdown = useCallback(() => setIsCounting(true), []);
  const stop = useCallback(() => setIsCounting(false), []);

  const onFrame = useCallback((frame: unknown, nowMs: number) => {
    const s = statsRef.current;
    s.js += 1;

    if (!eng.scheduler.shouldRun(nowMs)) return;

    const t0 = Date.now();
    const pose: Pose = poseFromFrame(frame, runtime);
    const check: CameraCheck = prepare(pose, def);
    s.latency = Date.now() - t0;
    s.ai += 1;

    setStatus(check.status);
    setHint(check.hint);
    setDebug((d) => ({ ...d, landmarks: pose.landmarks.length, confidence: maxVisibility(pose), spread: check.spread, framing: check.status, exercise: def.id }));

    if (nowMs - s.winStart >= 1000) {
      const elapsed = nowMs - s.winStart;
      setDebug((d) => ({ ...d, fps: Math.round((s.js / elapsed) * 1000), aiFps: Math.round((s.ai / elapsed) * 1000), inferenceLatencyMs: s.latency }));
      s.js = 0;
      s.ai = 0;
      s.winStart = nowMs;
    }

    if (check.status !== 'POSITION_VALID' || !isCountingRef.current) {
      eng.rep.reset();
      setDebug((d) => ({ ...d, phase: eng.rep.getState() }));
      return;
    }

    const frameData: LandmarkFrame = { landmarks: pose.landmarks, timestamp: nowMs };
    const metrics = compute(frameData);

    const done = eng.rep.step(metrics, nowMs, def);
    if (done) {
      eng.form.track(metrics);
      const form = eng.form.scoreRep(done, [metrics], def);
      formScoreRef.current = form.score;
      setQuality(form.quality);
      const entry: SessionRep = {
        counted: done.counted,
        quality: form.quality,
        score: form.score,
        romKneeDeg: done.romKneeDeg,
        durationMs: nowMs - done.repStartMs,
        velocityDegPerSec: metrics.velocityDegPerSec,
      };
      session.track(entry);
      statsRef.current.tempo = entry.durationMs;

      if (done.counted) {
        setRepCount((c) => c + 1);
        const msg = form.quality === 'GOOD'
          ? CoachingEngine.positiveMessages()[0]
          : 'Controla el movimiento.';
        void speak(msg);
        void eng.coach.record({ message: msg, priority: 1, minCooldownMs: 1500 }, nowMs);
      }

      setDebug((d) => ({
        ...d,
        form: form.score,
        repQuality: form.quality,
        rom: done.romKneeDeg,
        tempo: statsRef.current.tempo,
        phase: eng.rep.getState(),
      }));
    }

    const level = eng.fatigue.update(metrics, formScoreRef.current);
    session.setFailureProximity(level.proximity);
    if (level.advice && eng.coach.shouldSpeak({ message: level.advice, priority: 2, minCooldownMs: 12000 }, nowMs)) {
      void speak(level.advice);
      void eng.coach.record({ message: level.advice, priority: 2, minCooldownMs: 12000 }, nowMs);
    }
    setDebug((d) => ({ ...d, velocity: metrics.velocityDegPerSec, failure: level.proximity, phase: eng.rep.getState(), reps: repCount }));
  }, [eng, runtime, def, session, repCount]);

  useEffect(() => {
    if (session.completed) {
      setIsCounting(false);
      void persistSessionSummary(session.summary);
      setDebug((d) => ({ ...d, reps: session.summary.completed }));
    }
  }, [session.completed, session.summary]);

  return { status, hint, repCount, target, quality, isCounting, debug, onFrame, startCountdown, stop, sessionCompleted: session.completed, summary: session.summary };
}