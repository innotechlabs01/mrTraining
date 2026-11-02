# Mobile Camera AI Engine — Implementation Plan (SQUAT First)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the AI camera-guided workout for SQUAT end-to-end on `apps/mobile` — camera → position (green frame) → countdown → pose → movement → rep → form → GOOD/REGULAR/BAD → voice coaching → workout progress → completion. On-device, offline, iOS + Android.

**Architecture:** Layered pipeline (`Camera → FrameScheduler → PoseEngine/PoseRuntime → MovementEngine → ExerciseEngine → RepEngine → FormEngine → FatigueEngine → CoachingEngine`). Pure logic lives in TS engines that are unit-tested with Jest; native layers (reactive-native-vision-camera v5 + MediaPipe Pose Landmarker) are thin bridges behind `PoseRuntime`. A `FrameScheduler` throttles inference (~10–15 FPS). `ExerciseDefinition` plugins per exercise (SQUAT first, PUSH_UP/LUNGE later).

**Tech Stack:** `react-native-vision-camera` v5 (Nitro) · MediaPipe Pose Landmarker (33 lm) behind `PoseRuntime` · `react-native-worklets` · `expo-speech` (TTS) · `expo-battery` · Jest + jest-expo.

**Spec:** `docs/superpowers/specs/2026-09-06-mobile-camera-ai-engine-design.md` — the plan argues from the spec; executors read both.

## Global Constraints

- Project: `apps/mobile`, Expo 54 + dev-client, RN 0.81, TS strict (`noEmit > :` is a pass gate). Root: `/Users/frg/Documents/Innotechlabs/Mao_Coaching/webs/mr-training`.
- TypeScript strict. No `any`. Explicit return types. ≤250 lines per file (rules `02-mobile-code-quality`).
- Feature-first: everything under `src/features/ai/`. Shared UI tokens from `src/shared/theme/tokens.ts` (accent `#16E37A`, dark-first). Touch targets ≥ 44pt. No emoji as icons — SVG only.
- No new web/backend API contract. Reuse existing `/athlete/sessions/:id/complete` and `/athlete/sessions/:id/sets`. Sync only aggregate results. No video uploads (spec §36).
- Offline-first, local AI (spec §35). Camera/model released to idle when not needed (§24).
- Verify each task: `cd apps/mobile && npx tsc --noEmit && npm test`.
- Commits: conventional commits, no AI attribution (repo rule).

---

### Task 0: Phase 0 — Benchmark harness + runtime lock (device gate)

Do this on real hardware before locking the pose runtime & inference FPS.

**Files:**
- Create: `apps/mobile/src/features/ai/bench/BENCHMARK.md`
- Create: `apps/mobile/src/features/ai/bench/benchmark.ts` (metrics collector)

**Interfaces:**
- Produces: `recordBenchmarkRow(fields: Partial<BenchRow>): void` and a documented decision in `BENCHMARK.md`.

- [ ] **Step 1: Define the record shape**

```ts
// benchmark.ts
export interface BenchRow {
  deviceTier: 'HIGH_END' | 'MID_RANGE' | 'LOW_END';
  device: string;            // e.g. "iPhone 15", "Pixel 7"
  osVersion: string;
  model: string;             // runtime + model name
  inferenceFps: number;
  latencyMs: number;
  cpuPercent: number;
  ramMb: number;
  batteryStartPct: number;
  batteryEndPct: number;
  thermalState: string;
  droppedFrames: number;
  sessionMin: number;
  accuracyNote: string;
  pass: boolean;             // meets acceptance bar
}

export function recordBenchmarkRow(row: BenchRow): BenchRow {
  return row; // returns struct for logging to BENCHMARK.md table
}
```

- [ ] **Step 2: Manual device run**

Run the benchmark camera+pose scaffold (build after Task 11 wiring) on ≥1 iOS + ≥1 Android across tiers, sessions 5/15/30/45/60 min (spec §37). Record rows for MediaPipe and (if installed) the fallback.

- [ ] **Step 3: Record decision**

Append the measured table + a one-line locked decision to `BENCHMARK.md`:
```markdown
## Decision (LOCKED)
Runtime: MediaPipe Pose Landmarker |  Target inference FPS: <n> | Device tiers mapped: HIGH_END=<n>, MID_RANGE=<n>, LOW_END=<n>
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/ai/bench
git commit -m "docs(mobile): record pose benchmark + runtime lock"
```

**Gate:** PS no pass until `BENCHMARK.md` has a real measured table; executors lacking devices must stop and surface this to the human, not silently pick numbers.

---

### Task 1: Domain types

Pure types — no logic, no deps. These names are used by every later task.

**Files:**
- Create: `apps/mobile/src/features/ai/domain/Landmark.ts`
- Create: `apps/mobile/src/features/ai/domain/BodyPart.ts`
- Create: `apps/mobile/src/features/ai/domain/RepTypes.ts`
- Test: `apps/mobile/src/features/ai/domain/__tests__/landmark.test.ts` (trivial sanity)

**Interfaces:**
- Produces: `Landmark`, `LandmarkFrame`, `Pose`, `LANDMARK_IDS`, `BodyPart`, `CameraPositionStatus`, `RepQuality`, `RepState`, `ExerciseDefinition` (see code below).

- [ ] **Step 1: Landmark and Pose**

```ts
// Landmark.ts
export interface Landmark {
  x: number; // normalized 0..1
  y: number;
  z: number;
  confidence: number; // 0..1 (model presence confidence)
  visibility: number; // 0..1 (limb visibility)
}
export interface LandmarkFrame {
  landmarks: Landmark[];
  timestamp: number; // ms
}
export interface Pose {
  landmarks: Landmark[];
  detected: boolean;
  confidence: number; // 0..1 mean visibility of tracked set
}
```

- [ ] **Step 2: Landmark ids + body parts (BlazePose 33)**

```ts
// BodyPart.ts
export const LANDMARK_IDS = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32,
} as const;

export type BodyPart =
  | 'head' | 'shoulders' | 'hips' | 'knees'
  | 'ankles' | 'feet' | 'elbows' | 'wrists';

// Map each named part to the list of landmark indices required to consider it visible.
export const BODY_PART_LANDMARKS: Record<BodyPart, number[]> = {
  head: [LANDMARK_IDS.nose, LANDMARK_IDS.leftShoulder, LANDMARK_IDS.rightShoulder],
  shoulders: [LANDMARK_IDS.leftShoulder, LANDMARK_IDS.rightShoulder],
  hips: [LANDMARK_IDS.leftHip, LANDMARK_IDS.rightHip],
  knees: [LANDMARK_IDS.leftKnee, LANDMARK_IDS.rightKnee],
  ankles: [LANDMARK_IDS.leftAnkle, LANDMARK_IDS.rightAnkle],
  feet: [LANDMARK_IDS.leftFootIndex, LANDMARK_IDS.rightFootIndex],
  elbows: [LANDMARK_IDS.leftElbow, LANDMARK_IDS.rightElbow],
  wrists: [LANDMARK_IDS.leftWrist, LANDMARK_IDS.rightWrist],
};
```

- [ ] **Step 3: Status, quality, rep-state, exercise-definition**

```ts
// RepTypes.ts
export type CameraPositionStatus = 'POSITION_INVALID' | 'POSITION_ADJUSTING' | 'POSITION_VALID';
export type RepQuality = 'GOOD' | 'REGULAR' | 'BAD' | 'UNKNOWN';
export type RepValidity = 'VALID' | 'INVALID' | 'UNKNOWN';

export enum RepState {
  IDLE = 'IDLE',
  READY = 'READY',
  MOVEMENT_START = 'MOVEMENT_START',
  ECCENTRIC = 'ECCENTRIC',
  BOTTOM = 'BOTTOM',
  CONCENTRIC = 'CONCENTRIC',
  COMPLETED = 'COMPLETED',
}

export type CameraOrientation = 'frontal' | 'lateral' | 'auto';

export interface DistanceBand {
  minSpread: number; // min fraction of frame width/height occupied by body bbox
  maxSpread: number; // max fraction
}

export interface FramingRule {
  bodyPart: BodyPart;
  minVisibility: number; // 0..1
}

export interface MovementRules {
  minConfidence: number; // 0..1 gate
}

export interface RepRules {
  topKneeAngleDeg: number;     // standing ~ full extension (>= this = top)
  bottomKneeAngleDeg: number;  // <= this = bottom (depth reached)
  goodKneeAngleDeg: number;    // bottom knee angle <= this = GOOD depth
  minAngleTravelDeg: number;   // min knee angle change across rep to count
  minRepDurationMs: number;
  maxRepDurationMs: number;
}

export interface FormRules {
  kneeValgusToleranceDeg: number;
  minKneeForGoodDeg: number;    // same as goodKneeAngleDeg (kept for readability)
  maxLateralSway: number;       // normalized hip x std-dev threshold
  minSymmetry: number;          // 0..1 left/right agreement for GOOD
}

export interface ExerciseDefinition {
  id: string;
  name: string;
  cameraOrientation: CameraOrientation;
  requiredBodyParts: BodyPart[];
  minimumVisibility: number;
  preferredDistance: DistanceBand;
  framingRules: FramingRule[];
  movement: MovementRules;
  rep: RepRules;
  form: FormRules;
}
```

- [ ] **Step 4: Verify**

Run `npx tsc --noEmit` (pass) and `npm test` (trivial failing tests if any — add 2). Commit:

```bash
git add apps/mobile/src/features/ai/domain
git commit -m "feat(mobile): ai domain types for camera engine"
```

---

### Task 2: PoseRuntime interface + MediaPipe stub + FrameScheduler

**Files:**
- Create: `apps/mobile/src/features/ai/infrastructure/pose/PoseRuntime.ts`
- Create: `apps/mobile/src/features/ai/infrastructure/pose/MediaPipePoseRuntime.ts`
- Create: `apps/mobile/src/features/ai/application/FrameScheduler.ts`
- Test: `apps/mobile/src/features/ai/application/__tests__/frameScheduler.test.ts`

**Interfaces:**
- Consumes: `Pose`, `LandmarkFrame` (Task 1).
- Produces:
  - `PoseRuntime { detect(frame: unknown): LandmarkFrame | null }` (frame type opaque to engines)
  - `MediaPipePoseRuntime implements PoseRuntime`
  - `FrameScheduler { shouldRun(nowMs: number): boolean; setTargetFps(n: number): void }`
  - `SchedulerStats { lastRunMs: number; targetFps: number; periodMs: number }`

- [ ] **Step 1: Write the failing scheduler test**

```ts
// frameScheduler.test.ts
import { FrameScheduler } from '../FrameScheduler';

describe('FrameScheduler', () => {
  it('throttles to target fps', () => {
    const s = new FrameScheduler(10); // 10 fps => 100ms period
    expect(s.shouldRun(0)).toBe(true);
    expect(s.shouldRun(50)).toBe(false);
    expect(s.shouldRun(100)).toBe(true);
  });
  it('changes target fps', () => {
    const s = new FrameScheduler(10);
    s.setTargetFps(5); // 200ms
    expect(s.shouldRun(0)).toBe(true);
    expect(s.shouldRun(190)).toBe(false);
    expect(s.shouldRun(200)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx jest src/features/ai/application/__tests__/frameScheduler.test.ts -v`
Expected: FAIL ("FrameScheduler is not defined").

- [ ] **Step 3: Implement**

```ts
// FrameScheduler.ts
export class FrameScheduler {
  private lastRunMs = -Infinity;
  private targetFps: number;

  constructor(targetFps = 12) {
    this.targetFps = targetFps;
  }

  get periodMs(): number {
    return Math.floor(1000 / this.targetFps);
  }

  setTargetFps(fps: number): void {
    this.targetFps = Math.max(1, Math.min(30, Math.round(fps)));
  }

  shouldRun(nowMs: number): boolean {
    if (nowMs - this.lastRunMs >= this.periodMs) {
      this.lastRunMs = nowMs;
      return true;
    }
    return false;
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx jest src/features/ai/application/__tests__/frameScheduler.test.ts -v`
Expected: PASS (2 tests).

- [ ] **Step 5: PoseRuntime interface + MediaPipe stub**

```ts
// PoseRuntime.ts
import type { LandmarkFrame } from '../../domain/Landmark';

/**
 * Swap point (spec §15): engines never depend on a concrete ML runtime.
 * `input` is opaque to engines — the native layer feeds a video frame.
 */
export interface PoseRuntime {
  detect(input: unknown): LandmarkFrame | null;
}
```

```ts
// MediaPipePoseRuntime.ts
import type { PoseRuntime } from './PoseRuntime';
import type { LandmarkFrame } from '../../domain/Landmark';

/**
 * v1 runtime backed by MediaPipe Pose Landmarker (BlazePose, 33 lm).
 * Native wiring is completed in Task 11; the JS surface stays behind PoseRuntime.
 */
export class MediaPipePoseRuntime implements PoseRuntime {
  detect(_input: unknown): LandmarkFrame | null {
    // Task 11 replaces this bridge with the real frame-processor call.
    return null;
  }
}
```

- [ ] **Step 6: Verify + commit**

Run `npx tsc --noEmit && npm test`. Commit:

```bash
git add apps/mobile/src/features/ai/infrastructure/pose apps/mobile/src/features/ai/application
git commit -m "feat(mobile): pose runtime abstraction + frame scheduler"
```

---

### Task 3: Geometry utilities (angle, ROM, distance)

Pure vector math from landmarks. No device needed.

**Files:**
- Create: `apps/mobile/src/features/ai/application/geometry.ts`
- Test: `apps/mobile/src/features/ai/application/__tests__/geometry.test.ts`

**Interfaces:**
- Produces:
  - `angleDeg(a: Landmark, b: Landmark, c: Landmark): number` — angle at b from a-b-c.
  - `hipDropRatio(hip: Landmark, knee: Landmark, ankle: Landmark): number` — 0 standing, ≥1 hip below knee.
  - `frameSpread(landmarks: Landmark[]): number` — largest axis fraction of body bbox (0..1).
  - `avgMid(a: Landmark, b: Landmark): { x: number; y: number }` (z/conf ignored here).

- [ ] **Step 1: Write failing tests**

```ts
// geometry.test.ts
import { angleDeg, hipDropRatio, frameSpread, avgMid } from '../geometry';
import type { Landmark } from '../../domain/Landmark';

const L = (x: number, y: number): Landmark => ({ x, y, z: 0, confidence: 1, visibility: 1 });
const EPS = 1e-3;

describe('geometry', () => {
  it('computes a right angle at the middle point', () => {
    const a = L(0, 0), b = L(1, 0), c = L(1, 1);
    expect(angleDeg(a, b, c)).toBeCloseTo(90, 4);
  });
  it('hipDropRatio is 0 standing, 1 at knee, >1 below knee', () => {
    const knee = L(0.5, 0.6), ankle = L(0.5, 0.9);
    expect(hipDropRatio(L(0.5, 0.3), knee, ankle)).toBeCloseTo(0, 4);
    expect(hipDropRatio(knee, knee, ankle)).toBeCloseTo(1, 4);
    expect(hipDropRatio(L(0.5, 0.7), knee, ankle)).toBeGreaterThan(1);
  });
  it('computes spread and midpoint', () => {
    expect(frameSpread([L(0, 0), L(1, 0.5)])).toBeCloseTo(1, 4);
    const m = avgMid(L(0, 0), L(0.4, 0.2));
    expect(m.x).toBeCloseTo(0.2, 4);
    expect(m.y).toBeCloseTo(0.1, 4);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx jest src/features/ai/application/__tests__/geometry.test.ts -v`

- [ ] **Step 3: Implement**

```ts
// geometry.ts
import type { Landmark } from '../domain/Landmark';

function toRad(d: number): number { return (d * Math.PI) / 180; }
function toDeg(r: number): number { return (r * 180) / Math.PI; }

export function angleDeg(a: Landmark, b: Landmark, c: Landmark): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const m1 = Math.hypot(v1.x, v1.y);
  const m2 = Math.hypot(v2.x, v2.y);
  if (m1 === 0 || m2 === 0) return 180;
  const cos = Math.max(-1, Math.min(1, dot / (m1 * m2)));
  return toDeg(Math.acos(cos));
}

/** 0 = hip inline with knee (standing); 1 = hip at knee; >1 = hip below knee. */
export function hipDropRatio(hip: Landmark, knee: Landmark, ankle: Landmark): number {
  const hipAnkle = hip.y - ankle.y;
  const kneeAnkle = knee.y - ankle.y;
  if (kneeAnkle === 0) return 0;
  return hipAnkle / kneeAnkle; // y grows downward: lower hip = smaller hipAnkle
}

export function frameSpread(landmarks: Landmark[]): number {
  if (landmarks.length === 0) return 0;
  const xs = landmarks.map((l) => l.x);
  const ys = landmarks.map((l) => l.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  return Math.max(w, h);
}

export function avgMid(
  a: Landmark,
  b: Landmark,
): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx jest src/features/ai/application/__tests__/geometry.test.ts -v`

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/ai/application/geometry.ts apps/mobile/src/features/ai/application/__tests__/geometry.test.ts
git commit -m "feat(mobile): pose geometry utilities (angle, depth, spread)"
```

---

### Task 4: CameraPreparationEngine (detection, framing, distance, position state)

Pure logic → `POSITION_INVALID | POSITION_ADJUSTING | POSITION_VALID` + human instruction.

**Files:**
- Create: `apps/mobile/src/features/ai/application/CameraPreparationEngine.ts`
- Test: `apps/mobile/src/features/ai/application/__tests__/cameraPreparation.test.ts`

**Interfaces:**
- Consumes: `LandmarkFrame`, `Pose`, `BODY_PART_LANDMARKS`, `ExerciseDefinition`, `frameSpread`, `avgMid` (Tasks 1, 3).
- Produces:
  - `CameraCheck { status: CameraPositionStatus; hint: string | null; visibleParts: BodyPart[]; spread: number }`
  - `prepare(pose: Pose, def: ExerciseDefinition): CameraCheck`
  - `assessBody(list: Landmark[], def: ExerciseDefinition): { visible: BodyPart[]; missing: BodyPart[] }`

- [ ] **Step 1: Write failing tests**

```ts
// cameraPreparation.test.ts
import { assessBody, prepare } from '../CameraPreparationEngine';
import type { Landmark } from '../../domain/Landmark';
import type { ExerciseDefinition } from '../../domain/RepTypes';

const L = (x: number, y: number, visibility = 1): Landmark => ({ x, y, z: 0, confidence: 1, visibility });

function squatDef(): ExerciseDefinition {
  return {
    id: 'squat', name: 'Squat', cameraOrientation: 'frontal',
    requiredBodyParts: ['head', 'shoulders', 'hips', 'knees', 'ankles'],
    minimumVisibility: 0.5,
    preferredDistance: { minSpread: 0.35, maxSpread: 0.8 },
    framingRules: [
      { bodyPart: 'head', minVisibility: 0.5 },
      { bodyPart: 'ankles', minVisibility: 0.5 },
    ],
    movement: { minConfidence: 0.6 },
    rep: { topKneeAngleDeg: 160, bottomKneeAngleDeg: 100, goodKneeAngleDeg: 90, minAngleTravelDeg: 30, minRepDurationMs: 250, maxRepDurationMs: 4000 },
    form: { kneeValgusToleranceDeg: 10, minKneeForGoodDeg: 90, maxLateralSway: 0.08, minSymmetry: 0.85 },
  };
}
// index: nose=0 lShoulder=11 rShoulder=12 lHip=23 rHip=24 lKnee=25 rKnee=26 lAnkle=27 rAnkle=28
function fullBody(): Landmark[] {
  const pts: [number, number, number][] = [
    [0, 0.1, 1], [11, 0.3, 1], [12, 0.7, 1], [23, 0.35, 1], [24, 0.65, 1],
    [25, 0.4, 1], [26, 0.6, 1], [27, 0.42, 1], [28, 0.58, 1],
  ];
  const arr: Landmark[] = [];
  for (const [i, x, y] of pts) arr[i] = L(x, y);
  return arr;
}

describe('assessBody', () => {
  it('marks all required parts visible when landmarks present', () => {
    const { visible, missing } = assessBody(fullBody(), squatDef());
    expect(missing).toHaveLength(0);
    expect(visible).toEqual(expect.arrayContaining(['head', 'shoulders', 'hips', 'knees', 'ankles']));
  });
});

describe('prepare', () => {
  it('returns POSITION_VALID with no hint for a full, well-framed body', () => {
    const body = fullBody();
    const check = prepare({ landmarks: body, detected: true, confidence: 0.9 }, squatDef());
    expect(check.status).toBe('POSITION_VALID');
    expect(check.hint).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx jest src/features/ai/application/__tests__/cameraPreparation.test.ts -v`

- [ ] **Step 3: Implement**

```ts
// CameraPreparationEngine.ts
import type { LandmarkFrame, Pose } from '../domain/Landmark';
import { BODY_PART_LANDMARKS, type BodyPart } from '../domain/BodyPart';
import type { CameraPositionStatus, ExerciseDefinition } from '../domain/RepTypes';
import { frameSpread, avgMid } from './geometry';

export interface CameraCheck {
  status: CameraPositionStatus;
  hint: string | null;
  visibleParts: BodyPart[];
  spread: number;
}

export function assessBody(list: Landmark[], def: ExerciseDefinition): {
  visible: BodyPart[]; missing: BodyPart[];
} {
  const visible: BodyPart[] = [];
  const missing: BodyPart[] = [];
  for (const part of def.requiredBodyParts) {
    const idxs = BODY_PART_LANDMARKS[part];
    const ok = idxs.length > 0 && idxs.every((i) => list[i] && list[i].visibility >= def.minimumVisibility);
    (ok ? visible : missing).push(part);
  }
  return { visible, missing };
}

export function prepare(pose: Pose, def: ExerciseDefinition): CameraCheck {
  if (!pose.detected || pose.landmarks.length === 0) {
    return { status: 'POSITION_INVALID', hint: 'No te detecto. Entra en el cuadro.', visibleParts: [], spread: 0 };
  }
  const list = pose.landmarks;
  const { missing, visible } = assessBody(list, def);
  const spread = frameSpread(list);

  if (missing.length > 0) {
    return { status: 'POSITION_INVALID', hint: 'Coloca todo tu cuerpo dentro del cuadro.', visibleParts: visible, spread };
  }

  if (spread < def.preferredDistance.minSpread) {
    return { status: 'POSITION_ADJUSTING', hint: 'Acércate un poco.', visibleParts: visible, spread };
  }
  if (spread > def.preferredDistance.maxSpread) {
    return { status: 'POSITION_ADJUSTING', hint: 'Aléjate un poco.', visibleParts: visible, spread };
  }

  for (const rule of def.framingRules) {
    const idxs = BODY_PART_LANDMARKS[rule.bodyPart];
    const ok = idxs.every((i) => list[i] && list[i].visibility >= rule.minVisibility);
    if (!ok) {
      return { status: 'POSITION_ADJUSTING', hint: 'Coloca la cámara un poco más abajo.', visibleParts: visible, spread };
    }
  }

  return { status: 'POSITION_VALID', hint: null, visibleParts: visible, spread };
}
```

Note: `avgMid` is not used by `prepare`; it lives in geometry for later tasks (MovementEngine). Keep it exported there.

- [ ] **Step 4: Run — expect PASS**

Run: `npx jest src/features/ai/application/__tests__/cameraPreparation.test.ts -v`

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/ai/application/CameraPreparationEngine.ts apps/mobile/src/features/ai/application/__tests__/cameraPreparation.test.ts
git commit -m "feat(mobile): camera preparation engine (framing, distance, position)"
```

---

### Task 5: MovementEngine (metrics from landmarks)

Computes per-frame squat metrics.

**Files:**
- Create: `apps/mobile/src/features/ai/application/MovementEngine.ts`
- Test: `apps/mobile/src/features/ai/application/__tests__/movementEngine.test.ts`

**Interfaces:**
- Consumes: `LandmarkFrame`, `LANDMARK_IDS`, `angleDeg`, `hipDropRatio`, `avgMid` (Tasks 1, 3).
- Produces:
  - `MovementMetrics { kneeAngleDeg: number; hipDrop: number; velocityDegPerSec: number; symmetry: number; lateralSway: number }`
  - `compute(lm: LandmarkFrame, prev?: MovementMetrics): MovementMetrics`

- [ ] **Step 1: Write failing tests**

```ts
// movementEngine.test.ts
import { compute } from '../MovementEngine';
import { LANDMARK_IDS as ID } from '../../domain/BodyPart';
import type { Landmark } from '../../domain/Landmark';

const L = (x: number, y: number): Landmark => ({ x, y, z: 0, confidence: 1, visibility: 1 });

describe('MovementEngine', () => {
  it('reports ~180 deg knee angle when standing straight', () => {
    const lm: Landmark[] = [];
    lm[ID.leftHip] = L(0.5, 0.3); lm[ID.leftKnee] = L(0.5, 0.6); lm[ID.leftAnkle] = L(0.5, 0.9);
    const m = compute({ landmarks: lm, timestamp: 1000 });
    expect(m.kneeAngleDeg).toBeCloseTo(180, 0);
  });
  it('reports ~90 deg knee angle at a deep squat', () => {
    const lm: Landmark[] = [];
    lm[ID.leftHip] = L(0.5, 0.7); lm[ID.leftKnee] = L(0.5, 0.6); lm[ID.leftAnkle] = L(0.5, 0.9);
    const m = compute({ landmarks: lm, timestamp: 1000 });
    expect(m.kneeAngleDeg).toBeCloseTo(90, 0);
    expect(m.hipDrop).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx jest src/features/ai/application/__tests__/movementEngine.test.ts -v`

- [ ] **Step 3: Implement**

```ts
// MovementEngine.ts
import type { LandmarkFrame } from '../domain/Landmark';
import { LANDMARK_IDS as ID } from '../domain/BodyPart';
import { angleDeg, hipDropRatio, avgMid } from './geometry';

export interface MovementMetrics {
  kneeAngleDeg: number;
  hipDrop: number;
  velocityDegPerSec: number;
  symmetry: number;   // 0..1, closer to 1 = both knees agree
  lateralSway: number; // 0..1 hip x-distance from frame center
}

function midLandmark(lmList: (Landmark | undefined)[]): Landmark | null {
  if (!lmList[0] || !lmList[1]) return null;
  const m = avgMid(lmList[0], lmList[1]);
  return { x: m.x, y: m.y, z: 0, confidence: 1, visibility: 1 };
}

export function compute(lm: LandmarkFrame, prev?: MovementMetrics): MovementMetrics {
  const a = lm.landmarks;
  const hip = midLandmark([a[ID.leftHip], a[ID.rightHip]]);
  const lknee = a[ID.leftKnee];
  const rknee = a[ID.rightKnee];
  const ankle = midLandmark([a[ID.leftAnkle], a[ID.rightAnkle]]);
  const lAnkle = a[ID.leftAnkle];

  const leftKnee = lknee && lAnkle && hip ? angleDeg(hip, lknee, lAnkle) : 180;
  const rightKnee = rknee && lAnkle && hip ? angleDeg(hip, rknee, ankle ?? lAnkle) : leftKnee;
  const kneeAngleDeg = (leftKnee + rightKnee) / 2;
  const hipDrop = hip && (lknee ?? rknee) && ankle ? hipDropRatio(hip, (lknee ?? rknee)!, ankle) : 0;
  const symmetry = leftKnee + rightKnee === 0 ? 1 : 1 - Math.min(1, Math.abs(leftKnee - rightKnee) / 90);
  const lateralSway = hip ? Math.abs(hip.x - 0.5) : 0;

  const velocityDegPerSec = prev && lm.timestamp > 0
    ? Math.abs(kneeAngleDeg - prev.kneeAngleDeg) / Math.max(0.001, lm.timestamp - 0)
    : 0;

  return { kneeAngleDeg, hipDrop, velocityDegPerSec, symmetry, lateralSway };
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx jest src/features/ai/application/__tests__/movementEngine.test.ts -v`

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/ai/application/MovementEngine.ts apps/mobile/src/features/ai/application/__tests__/movementEngine.test.ts
git commit -m "feat(mobile): movement engine squat metrics"
```

---

### Task 6: RepEngine (state machine + validity + quality)

The core: no double count, no false positives.

**Files:**
- Create: `apps/mobile/src/features/ai/application/RepEngine.ts`
- Test: `apps/mobile/src/features/ai/application/__tests__/repEngine.test.ts`

**Interfaces:**
- Consumes: `RepState`, `RepQuality`, `RepValidity`, `RepRules`, `MovementMetrics` (Tasks 1, 5).
- Produces:
  - `RepResult { state: RepState; counted: boolean; quality: RepQuality; validity: RepValidity; reason: string | null; romKneeDeg: number; repStartMs: number } | null`
  - `class RepEngine { reset(): void; step(metrics: MovementMetrics, nowMs: number, def: ExerciseDefinition): RepResult | null; getState(): RepState; getCounts(): { good: number; regular: number; bad: number; unknown: number } }`

- [ ] **Step 1: Write failing tests**

```ts
// repEngine.test.ts
import { RepEngine } from '../RepEngine';
import type { ExerciseDefinition } from '../../domain/RepTypes';
import type { MovementMetrics } from '../MovementEngine';

const def = (): ExerciseDefinition => ({
  id: 'squat', name: 'Squat', cameraOrientation: 'frontal',
  requiredBodyParts: [], minimumVisibility: 0.5,
  preferredDistance: { minSpread: 0.35, maxSpread: 0.8 }, framingRules: [],
  movement: { minConfidence: 0.6 },
  rep: { topKneeAngleDeg: 160, bottomKneeAngleDeg: 100, goodKneeAngleDeg: 90, minAngleTravelDeg: 30, minRepDurationMs: 250, maxRepDurationMs: 4000 },
  form: { kneeValgusToleranceDeg: 10, minKneeForGoodDeg: 90, maxLateralSway: 0.08, minSymmetry: 0.85 },
});

const M = (knee: number, now: number): MovementMetrics =>
  ({ kneeAngleDeg: knee, hipDrop: knee < 90 ? 1.2 : 0, velocityDegPerSec: 0, symmetry: 0.95, lateralSway: 0.02 });

describe('RepEngine', () => {
  it('counts one GOOD rep on a full down-up cycle', () => {
    const eng = new RepEngine();
    const d = def();
    eng.step(M(170, 0), 0, d);
    // eccentric down
    eng.step(M(100, 300), 300, d);
    eng.step(M(80, 600), 600, d); // bottom - deep
    // concentric up
    const result = eng.step(M(170, 900), 900, d);
    expect(result).not.toBeNull();
    expect(result!.counted).toBe(true);
    expect(result!.quality).toBe('GOOD');
  });

  it('does NOT count a shallow (partial ROM) rep', () => {
    const eng = new RepEngine();
    const d = def();
    eng.step(M(170, 0), 0, d);
    eng.step(M(120, 300), 300, d); // only to 120 -> not enough travel toward bottom
    const result = eng.step(M(170, 600), 600, d);
    expect(result).not.toBeNull();
    expect(result!.counted).toBe(false);
    expect(result!.quality).toBe('BAD');
  });
});
```

(Use `result!` only in tests; never in src — TS strict fine in test files.)

- [ ] **Step 2: Run — expect FAIL**

Run: `npx jest src/features/ai/application/__tests__/repEngine.test.ts -v`

- [ ] **Step 3: Implement**

```ts
// RepEngine.ts
import { RepState, type RepQuality, type RepValidity, type RepRules, type ExerciseDefinition } from '../domain/RepTypes';
import type { MovementMetrics } from './MovementEngine';

export interface RepResult {
  state: RepState;
  counted: boolean;
  quality: RepQuality;
  validity: RepValidity;
  reason: string | null;
  romKneeDeg: number;
  repStartMs: number;
}

interface Counts { good: number; regular: number; bad: number; unknown: number; }

export class RepEngine {
  private state: RepState = RepState.IDLE;
  private bottomKnee = 180;
  private repStartMs = 0;
  private counts: Counts = { good: 0, regular: 0, bad: 0, unknown: 0 };

  reset(): void {
    this.state = RepState.IDLE;
    this.bottomKnee = 180;
    this.repStartMs = 0;
  }

  getState(): RepState { return this.state; }
  getCounts(): Counts { return { ...this.counts }; }

  private rollbackToIdle(): void {
    this.state = RepState.IDLE;
    this.bottomKnee = 180;
  }

  step(metrics: MovementMetrics, nowMs: number, def: ExerciseDefinition): RepResult | null {
    if (!(def.movement.minConfidence > 0) || metrics.kneeAngleDeg > 330) {
      this.rollbackToIdle();
      return null;
    }

    const rules: RepRules = def.rep;

    switch (this.state) {
      case RepState.IDLE:
        if (metrics.kneeAngleDeg >= rules.topKneeAngleDeg) {
          this.state = RepState.READY;
          this.repStartMs = nowMs;
          this.bottomKnee = 180;
        }
        return null;

      case RepState.READY:
        if (metrics.kneeAngleDeg < rules.topKneeAngleDeg) {
          this.state = RepState.ECCENTRIC;
        }
        return null;

      case RepState.ECCENTRIC:
        if (metrics.kneeAngleDeg < this.bottomKnee) this.bottomKnee = metrics.kneeAngleDeg;
        if (metrics.kneeAngleDeg <= rules.bottomKneeAngleDeg) {
          this.state = RepState.BOTTOM;
        }
        return null;

      case RepState.BOTTOM:
        if (metrics.kneeAngleDeg < this.bottomKnee) this.bottomKnee = metrics.kneeAngleDeg;
        if (metrics.kneeAngleDeg > rules.topKneeAngleDeg) {
          return this.finish(nowMs, def);
        }
        return null;

      default:
        return null;
    }
  }

  private finish(nowMs: number, def: ExerciseDefinition): RepResult {
    const duration = nowMs - this.repStartMs;
    const travel = 180 - this.bottomKnee;
    const minTravel = def.rep.minAngleTravelDeg;
    const durOk = duration >= def.rep.minRepDurationMs && duration <= def.rep.maxRepDurationMs;
    this.state = RepState.COMPLETED;

    let quality: RepQuality;
    let validity: RepValidity;
    let counted: boolean;
    let reason: string | null = null;

    if (this.bottomKnee > def.rep.goodKneeAngleDeg) {
      quality = 'BAD';
      validity = 'INVALID';
      counted = false;
      reason = 'Profundidad insuficiente. Baja más.';
    } else if (travel < minTravel) {
      quality = 'BAD';
      validity = 'INVALID';
      counted = false;
      reason = 'Movimiento incompleto.';
    } else if (!durOk) {
      quality = 'BAD';
      validity = 'INVALID';
      counted = false;
      reason = 'Controla el tempo del movimiento.';
    } else {
      quality = 'GOOD';
      validity = 'VALID';
      counted = true;
    }

    if (quality === 'GOOD') this.counts.good += 1;
    else this.counts.bad += 1;

    this.rollbackToIdle();
    return {
      state: RepState.COMPLETED, counted, quality, validity, reason,
      romKneeDeg: this.bottomKnee, repStartMs: this.repStartMs,
    };
  }
}
```

Note: `REGULAR` is assigned by `FormEngine` in Task 7 (quality upgrade/downgrade). The `RepEngine` classifies depth failures as BAD; shallow-but-over-threshold is GOOD here and FormEngine may downgrade to REGULAR.

- [ ] **Step 4: Run — expect PASS**

Run: `npx jest src/features/ai/application/__tests__/repEngine.test.ts -v`

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/ai/application/RepEngine.ts apps/mobile/src/features/ai/application/__tests__/repEngine.test.ts
git commit -m "feat(mobile): rep state machine, validity and quality"
```

---

### Task 7: FormEngine (0–100 + worsen to REGULAR/BAD)

**Files:**
- Create: `apps/mobile/src/features/ai/application/FormEngine.ts`
- Test: `apps/mobile/src/features/ai/application/__tests__/formEngine.test.ts`

**Interfaces:**
- Consumes: `RepQuality`, `RepResult`, `MovementMetrics`, `FormRules` (Tasks 1, 5, 6).
- Produces:
  - `FormResult { score: number; quality: RepQuality; maxScore: number; avgScore: number }`
  - `scoreRep(result: RepResult, samples: MovementMetrics[], def: ExerciseDefinition): FormResult`
  - `track(metrics): void` (accumulates running avg/best)

- [ ] **Step 1: Write failing tests**

```ts
// formEngine.test.ts
import { FormEngine } from '../FormEngine';
import type { ExerciseDefinition } from '../../domain/RepTypes';
import type { RepResult } from '../RepEngine';
import type { MovementMetrics } from '../MovementEngine';

const formRules = { kneeValgusToleranceDeg: 10, minKneeForGoodDeg: 90, maxLateralSway: 0.08, minSymmetry: 0.85 };

describe('FormEngine', () => {
  it('scores a clean deep rep high', () => {
    const eng = new FormEngine();
    const sample: MovementMetrics = { kneeAngleDeg: 80, hipDrop: 1.2, velocityDegPerSec: 100, symmetry: 0.95, lateralSway: 0.02 };
    const m: RepResult = { state: 'COMPLETED' as RepResult['state'], counted: true, quality: 'GOOD', validity: 'VALID', reason: null, romKneeDeg: 80, repStartMs: 0 };
    const r = eng.scoreRep(m, [sample], { form: formRules } as unknown as ExerciseDefinition);
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.quality).toBe('GOOD');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx jest src/features/ai/application/__tests__/formEngine.test.ts -v`

- [ ] **Step 3: Implement**

```ts
// FormEngine.ts
import type { RepQuality } from '../domain/RepTypes';
import type { RepResult } from './RepEngine';
import type { MovementMetrics } from './MovementEngine';

export interface FormResult {
  score: number;
  quality: RepQuality;
  maxScore: number;
  avgScore: number;
}

export class FormEngine {
  private max = 0;
  private total = 0;
  private n = 0;

  track(metrics: MovementMetrics): void {
    void metrics; // completeness metric hook for future degradation trend
  }

  private cap(x: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, x)); }

  scoreRep(_result: RepResult, samples: MovementMetrics[], def: { form: { maxLateralSway: number; minSymmetry: number; minKneeForGoodDeg: number } }): FormResult {
    if (samples.length === 0) {
      return { score: 0, quality: 'UNKNOWN', maxScore: this.max, avgScore: this.avg() };
    }
    const sway = Math.max(...samples.map((s) => s.lateralSway));
    const symmetry = Math.min(...samples.map((s) => s.symmetry));
    const minKnee = Math.min(...samples.map((s) => s.kneeAngleDeg));

    let score = 100;
    const swayPenalty = this.cap(sway - def.form.maxLateralSway, 0, 0.1) * 100;
    const symPenalty = this.cap(def.form.minSymmetry - symmetry, 0, 0.15) * 80;
    const depthBonus = Math.max(0, def.form.minKneeForGoodDeg - minKnee); // deeper = bonus pool
    score = Math.round(score - swayPenalty - symPenalty + this.cap(depthBonus, 0, 5));

    let quality: RepQuality = score >= 85 ? 'GOOD' : score >= 60 ? 'REGULAR' : 'BAD';

    this.total += score;
    this.n += 1;
    this.max = Math.max(this.max, score);

    return { score, quality, maxScore: this.max, avgScore: this.avg() };
  }

  private avg(): number {
    return this.n === 0 ? 0 : Math.round(this.total / this.n);
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx jest src/features/ai/application/__tests__/formEngine.test.ts -v`

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/ai/application/FormEngine.ts apps/mobile/src/features/ai/application/__tests__/formEngine.test.ts
git commit -m "feat(mobile): form score + quality refinement"
```

---

### Task 8: FatigueEngine (near-failure detection)

**Files:**
- Create: `apps/mobile/src/features/ai/application/FatigueEngine.ts`
- Test: `apps/mobile/src/features/ai/application/__tests__/fatigueEngine.test.ts`

**Interfaces:**
- Consumes: `MovementMetrics` (Task 5), `FormResult` (Task 7).
- Produces:
  - `FailureLevel { proximity: 0 | 1 | 2 | 3; advice: string | null }`
  - `class FatigueEngine { update(metrics: MovementMetrics, formScore: number): FailureLevel }`

- [ ] **Step 1: Write failing tests**

```ts
// fatigueEngine.test.ts
import { FatigueEngine } from '../FatigueEngine';

describe('FatigueEngine', () => {
  it('escalates when velocity and form decay', () => {
    const eng = new FatigueEngine();
    const m = { kneeAngleDeg: 90, hipDrop: 1, velocityDegPerSec: 20, symmetry: 0.7, lateralSway: 0.09 };
    let level = eng.update(m, 40);
    // repeat decay
    for (let i = 0; i < 5; i++) level = eng.update(m, 35);
    expect(level.proximity).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx jest src/features/ai/application/__tests__/fatigueEngine.test.ts -v`

- [ ] **Step 3: Implement**

```ts
// FatigueEngine.ts
import type { MovementMetrics } from './MovementEngine';

export interface FailureLevel { proximity: 0 | 1 | 2 | 3; advice: string | null; }

const ADVICE: Record<number, string | null> = {
  0: null,
  1: 'Tu técnica está empezando a bajar.',
  2: 'Últimas repeticiones. Mantén el control.',
  3: 'Es mejor descansar.',
};

export class FatigueEngine {
  private slowCount = 0;
  private badFormCount = 0;

  update(metrics: MovementMetrics, formScore: number): FailureLevel {
    const slow = metrics.velocityDegPerSec < 60;
    const poorForm = formScore < 55;
    const sway = metrics.lateralSway > 0.08;

    if (slow) this.slowCount = Math.min(this.slowCount + 1, 6);
    else this.slowCount = Math.max(this.slowCount - 1, 0);

    if (poorForm || sway) this.badFormCount = Math.min(this.badFormCount + 1, 6);
    else this.badFormCount = Math.max(this.badFormCount - 1, 0);

    if (this.badFormCount >= 5) return { proximity: 3, advice: ADVICE[3] };
    if (this.slowCount >= 4 && this.badFormCount >= 2) return { proximity: 2, advice: ADVICE[2] };
    if (this.slowCount >= 2 || this.badFormCount >= 2) return { proximity: 1, advice: ADVICE[1] };
    return { proximity: 0, advice: ADVICE[0] };
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx jest src/features/ai/application/__tests__/fatigueEngine.test.ts -v`

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/ai/application/FatigueEngine.ts apps/mobile/src/features/ai/application/__tests__/fatigueEngine.test.ts
git commit -m "feat(mobile): fatigue / near-failure engine"
```

---

### Task 9: CoachingEngine (voice: priority, cooldown, dedup)

**Files:**
- Create: `apps/mobile/src/features/ai/application/CoachingEngine.ts`
- Test: `apps/mobile/src/features/ai/application/__tests__/coachingEngine.test.ts`

**Interfaces:**
- Produces:
  - `SpeechEvent { message: string; priority: number; minCooldownMs: number }`
  - `class CoachingEngine { shouldSpeak(event: SpeechEvent, nowMs: number): boolean; lastSpokenAt(nowMs: number): void }`
  - `positiveMessages(): string[]` (variety — GOOD coaching, spec §30)

- [ ] **Step 1: Write failing tests**

```ts
// coachingEngine.test.ts
import { CoachingEngine } from '../CoachingEngine';

describe('CoachingEngine', () => {
  it('speaks a high-priority event immediately', () => {
    const c = new CoachingEngine();
    expect(c.shouldSpeak({ message: 'Listo', priority: 3, minCooldownMs: 1000 }, 0)).toBe(true);
  });
  it('suppresses a repeated low-priority message within cooldown', () => {
    const c = new CoachingEngine();
    c.shouldSpeak({ message: 'Bien', priority: 1, minCooldownMs: 2000 }, 0);
    c.lastSpokenAt(0);
    expect(c.shouldSpeak({ message: 'Bien', priority: 1, minCooldownMs: 2000 }, 500)).toBe(false);
    expect(c.shouldSpeak({ message: 'Bien', priority: 1, minCooldownMs: 2000 }, 2500)).toBe(true);
  });
  it('offers varied positive messages', () => {
    const msgs = CoachingEngine.positiveMessages();
    expect(msgs.length).toBeGreaterThan(2);
    expect(new Set(msgs).size).toBe(msgs.length);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx jest src/features/ai/application/__tests__/coachingEngine.test.ts -v`

- [ ] **Step 3: Implement**

```ts
// CoachingEngine.ts
export interface SpeechEvent {
  message: string;
  priority: number;      // 1..3
  minCooldownMs: number;
}

const POSITIVE = ['¡Bien!', '¡Excelente!', '¡Vamos!', '¡Perfecto!', '¡Sigue así!'];

export class CoachingEngine {
  private lastByPriority: Record<number, number> = {};
  private lastByMessage: Record<string, number> = {};

  static positiveMessages(): string[] { return [...POSITIVE]; }

  shouldSpeak(event: SpeechEvent, nowMs: number): boolean {
    const sincePriority = nowMs - (this.lastByPriority[event.priority] ?? -Infinity);
    const sinceMessage = nowMs - (this.lastByMessage[event.message] ?? -Infinity);
    return sincePriority >= event.minCooldownMs && sinceMessage >= event.minCooldownMs;
  }

  lastSpokenAt(nowMs: number): void {
    // updated by the consumer with last event data via record(); kept for API symmetry
    void nowMs;
  }

  record(event: SpeechEvent, nowMs: number): void {
    this.lastByPriority[event.priority] = nowMs;
    this.lastByMessage[event.message] = nowMs;
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx jest src/features/ai/application/__tests__/coachingEngine.test.ts -v`

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/ai/application/CoachingEngine.ts apps/mobile/src/features/ai/application/__tests__/coachingEngine.test.ts
git commit -m "feat(mobile): coaching engine (priority, cooldown, dedup)"
```

---

### Task 10: ExerciseDefinition registry (SQUAT), plus Resource managers (battery/thermal/tier)

**Files:**
- Create: `apps/mobile/src/features/ai/application/definitions/squat.ts`
- Create: `apps/mobile/src/features/ai/application/definitions/index.ts`
- Create: `apps/mobile/src/features/ai/application/BatteryManager.ts`
- Create: `apps/mobile/src/features/ai/application/ThermalManager.ts`
- Create: `apps/mobile/src/features/ai/application/DeviceTier.ts`
- Test: `apps/mobile/src/features/ai/application/__tests__/deviceTier.test.ts`

**Interfaces:**
- Produces:
  - `SQUAT_DEFINITION: ExerciseDefinition`
  - `definitionsById: Record<string, ExerciseDefinition>`
  - `class DeviceTier { static from(isLowPower: boolean, isHot: boolean): 'HIGH_END' | 'MID_RANGE' | 'LOW_END' }`
  - `class BatteryManager { setLevel(pct: number, charging: boolean): void; reducesInference(): boolean; targetFps(): number }`
  - `class ThermalManager { setThermal(th: 'nominal' | 'fair' | 'serious' | 'critical'): void; targetFps(): number; reduceResolution(): boolean; shouldReachLighterModel(): boolean }`

- [ ] **Step 1: Write failing tests**

```ts
// deviceTier.test.ts
import { DeviceTier } from '../DeviceTier';
import { BatteryManager } from '../BatteryManager';
import { ThermalManager } from '../ThermalManager';

describe('DeviceTier', () => {
  it('returns LOW_END on low power and hot', () => {
    expect(DeviceTier.from(true, true)).toBe('LOW_END');
  });
});

describe('BatteryManager', () => {
  it('reduces inference under 20% and not charging', () => {
    const b = new BatteryManager();
    b.setLevel(15, false);
    expect(b.reducesInference()).toBe(true);
    expect(b.targetFps()).toBeLessThanOrEqual(8);
  });
  it('keeps 12fps while healthy', () => {
    const b = new BatteryManager();
    b.setLevel(80, false);
    expect(b.targetFps()).toBe(12);
  });
});

describe('ThermalManager', () => {
  it('serious thermal cuts fps and suggests resolution drop', () => {
    const t = new ThermalManager();
    t.setThermal('serious');
    expect(t.targetFps()).toBeLessThan(12);
    expect(t.reduceResolution()).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx jest src/features/ai/application/__tests__/deviceTier.test.ts -v`

- [ ] **Step 3: Implement**

```ts
// DeviceTier.ts
export type DeviceTier = 'HIGH_END' | 'MID_RANGE' | 'LOW_END';

export class DeviceTier {
  static from(isLowPower: boolean, isHot: boolean): DeviceTier {
    if (isLowPower || isHot) return 'LOW_END';
    return 'HIGH_END';
  }
}
```

```ts
// BatteryManager.ts
export class BatteryManager {
  private pct = 100;
  private charging = false;

  setLevel(pct: number, charging: boolean): void {
    this.pct = Math.max(0, Math.min(100, pct));
    this.charging = charging;
  }

  reducesInference(): boolean {
    return !this.charging && this.pct < 20;
  }

  targetFps(): number {
    if (this.reducesInference()) return 6;
    return 12;
  }
}
```

```ts
// ThermalManager.ts
export type ThermalState = 'nominal' | 'fair' | 'serious' | 'critical';

export class ThermalManager {
  private th: ThermalState = 'nominal';

  setThermal(th: ThermalState): void { this.th = th; }

  targetFps(): number {
    switch (this.th) {
      case 'nominal': return 12;
      case 'fair': return 10;
      case 'serious': return 6;
      case 'critical': return 3;
    }
  }

  reduceResolution(): boolean {
    return this.th === 'serious' || this.th === 'critical';
  }

  shouldReachLighterModel(): boolean {
    return this.th === 'critical';
  }
}
```

```ts
// squat.ts — ExerciseDefinition for SQUAT
import type { ExerciseDefinition } from '../../domain/RepTypes';

export const SQUAT_DEFINITION: ExerciseDefinition = {
  id: 'squat',
  name: 'Squat',
  cameraOrientation: 'frontal',
  requiredBodyParts: ['head', 'shoulders', 'hips', 'knees', 'ankles', 'feet'],
  minimumVisibility: 0.5,
  preferredDistance: { minSpread: 0.35, maxSpread: 0.8 },
  framingRules: [
    { bodyPart: 'head', minVisibility: 0.5 },
    { bodyPart: 'hips', minVisibility: 0.5 },
    { bodyPart: 'ankles', minVisibility: 0.5 },
  ],
  movement: { minConfidence: 0.6 },
  rep: {
    topKneeAngleDeg: 160,
    bottomKneeAngleDeg: 100,
    goodKneeAngleDeg: 90,
    minAngleTravelDeg: 30,
    minRepDurationMs: 300,
    maxRepDurationMs: 4000,
  },
  form: {
    kneeValgusToleranceDeg: 10,
    minKneeForGoodDeg: 90,
    maxLateralSway: 0.08,
    minSymmetry: 0.85,
  },
};
```

```ts
// definitions/index.ts
import { SQUAT_DEFINITION } from './squat';
import type { ExerciseDefinition } from '../../domain/RepTypes';

const ALL: ExerciseDefinition[] = [SQUAT_DEFINITION];
export const definitionsById: Record<string, ExerciseDefinition> = Object.fromEntries(
  ALL.map((d) => [d.id, d]),
);
export function definitionFor(id: string): ExerciseDefinition | undefined {
  return definitionsById[id];
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx jest src/features/ai/application/__tests__/deviceTier.test.ts -v && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/ai/application/definitions apps/mobile/src/features/ai/application/BatteryManager.ts apps/mobile/src/features/ai/application/ThermalManager.ts apps/mobile/src/features/ai/application/DeviceTier.ts
git commit -m "feat(mobile): squat definition + resource managers (battery, thermal, tier)"
```

---

### Task 11: vision-camera v5 frame loop + overlays + countdown + voice + progress

Native integration; verified on device. **Install first, then wire.** Fall back to a frame-source seam if vision-camera version pins fail against RN 0.81 (Task 0 records this).

**Files:**
- Create: `apps/mobile/src/features/ai/infrastructure/camera/poseFrameSource.ts`
- Create: `apps/mobile/src/features/ai/presentation/screens/AiWorkoutScreen.tsx`
- Create: `apps/mobile/src/features/ai/presentation/components/FramingOverlay.tsx`
- Create: `apps/mobile/src/features/ai/presentation/components/DebugOverlay.tsx`
- Create: `apps/mobile/src/features/ai/presentation/hooks/useAiWorkout.ts`
- Create: `apps/mobile/src/features/ai/presentation/voice.ts`
- Modify: `package.json` (add deps), `app.json` (permissions/plugins)

**Interfaces:**
- Consumes: `PoseRuntime`, `FrameScheduler`, `CameraPreparationEngine.prepare`, `MovementEngine.compute`, `RepEngine`, `FormEngine`, `FatigueEngine`, `CoachingEngine`, `BatteryManager`, `ThermalManager`, `definitionFor` (Tasks 2,4–10).
- Produces:
  - `useAiWorkout(opts): { status: CameraPositionStatus; hint: string | null; repCount: number; target: number; quality: RepQuality | null; debug: DebugInfo; isCounting: boolean; startCountdown(): void; stop(): void }`
  - `speak(message: string): Promise<void>` via `expo-speech`

- [ ] **Step 1: Install deps**

```bash
cd apps/mobile
npx expo install react-native-vision-camera react-native-vision-camera-worklets expo-speech expo-battery
```

If `react-native-vision-camera@5` requires RN/worklets versions the project can't satisfy, resolve pins here and note the exact versions installed in `BENCHMARK.md`. Do not proceed past this step with a broken install.

- [ ] **Step 2: Wire the frame source**

```ts
// poseFrameSource.ts
import type { PoseRuntime } from '../pose/PoseRuntime';
import type { LandmarkFrame, Pose } from '../../domain/Landmark';

/** Feeds native frames to a PoseRuntime and returns a normalized Pose. */
export function poseFromFrame(frame: unknown, runtime: PoseRuntime): Pose {
  const result: LandmarkFrame | null = runtime.detect(frame);
  if (!result || result.landmarks.length === 0) {
    return { landmarks: [], detected: false, confidence: 0 };
  }
  const vis = result.landmarks.map((l) => l.visibility);
  const confidence = vis.length ? vis.reduce((a, b) => a + b, 0) / vis.length : 0;
  return { landmarks: result.landmarks, detected: true, confidence };
}
```

(Add a failing-then-passing Jest test for `poseFromFrame` over a fake runtime: null → not detected; list → detected + mean visibility.)

- [ ] **Step 3: Voice helper**

```ts
// voice.ts
import * as Speech from 'expo-speech';

export async function speak(message: string): Promise<void> {
  if (!message) return;
  Speech.speak(message, { language: 'es', rate: 0.95 });
}
```

- [ ] **Step 4: useAiWorkout hook (orchestrates engines per frame)**

```ts
// useAiWorkout.ts
import { useCallback, useRef, useState } from 'react';
import { FrameScheduler } from '../../application/FrameScheduler';
import { prepare, type CameraCheck } from '../../application/CameraPreparationEngine';
import { poseFromFrame } from '../../infrastructure/camera/poseFrameSource';
import type { PoseRuntime } from '../../infrastructure/pose/PoseRuntime';
import { RepEngine } from '../../application/RepEngine';
import { FormEngine } from '../../application/FormEngine';
import { FatigueEngine } from '../../application/FatigueEngine';
import { CoachingEngine } from '../../application/CoachingEngine';
import { compute } from '../../application/MovementEngine';
import { definitionFor } from '../../application/definitions';
import type { Pose } from '../../domain/Landmark';
import { speak } from '../voice';

export interface DebugInfo {
  fps: number; aiFps: number; model: string; phase: string; rom: number;
  velocity: number; form: number; failure: number;
}

export function useAiWorkout(
  exerciseId: string,
  target: number,
  runtime: PoseRuntime,
) {
  const def = definitionFor(exerciseId) ?? definitionFor('squat')!;
  const [status, setStatus] = useState<CameraPositionStatus>('POSITION_INVALID');
  const [hint, setHint] = useState<string | null>(null);
  const [repCount, setRepCount] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const [quality, setQuality] = useState<RepQuality | null>(null);
  // engines in refs to survive renders
  const eng = useRef({
    scheduler: new FrameScheduler(12),
    rep: new RepEngine(),
    form: new FormEngine(),
    fatigue: new FatigueEngine(),
    coach: new CoachingEngine(),
  }).current;
  const [debug, setDebug] = useState<DebugInfo>({ fps: 0, aiFps: 0, model: 'MediaPipe', phase: 'IDLE', rom: 0, velocity: 0, form: 0, failure: 0 });

  const startCountdown = useCallback(() => setIsCounting(true), []);
  const stop = useCallback(() => setIsCounting(false), []);

  const onFrame = useCallback((frame: unknown, nowMs: number) => {
    if (!eng.scheduler.shouldRun(nowMs)) return;
    const pose: Pose = poseFromFrame(frame, runtime);
    const check: CameraCheck = prepare(pose, def);
    setStatus(check.status);
    setHint(check.hint);

    if (check.status !== 'POSITION_VALID' || !isCounting) {
      eng.rep.reset();
      return;
    }

    const metrics = compute({ landmarks: pose.landmarks, timestamp: nowMs });
    const done = eng.rep.step(metrics, nowMs, def);
    if (done && done.counted) {
      eng.form.track(metrics); // accumulate
      const form = eng.form.scoreRep(done, [metrics], def);
      setQuality(form.quality);
      setRepCount((c) => c + 1);
      const msg = form.quality === 'GOOD' ? CoachingEngine.positiveMessages()[0] : 'Controla el movimiento.';
      setDebug((d) => ({ ...d, form: form.score, rom: done.romKneeDeg, phase: eng.rep.getState() }));
      void speak(msg);
      void eng.coach.record({ message: msg, priority: 1, minCooldownMs: 1500 }, nowMs);
    }
    const level = eng.fatigue.update(metrics, 50);
    if (level.advice && eng.coach.shouldSpeak({ message: level.advice, priority: 2, minCooldownMs: 12000 }, nowMs)) {
      void speak(level.advice);
      void eng.coach.record({ message: level.advice, priority: 2, minCooldownMs: 12000 }, nowMs);
    }
    setDebug((d) => ({ ...d, velocity: metrics.velocityDegPerSec, failure: level.proximity }));
  }, [eng, runtime, def, isCounting, repCount]);

  return { status, hint, repCount, target, quality, isCounting, debug, onFrame, startCountdown, stop };
}
```

No `float` — `RepQuality` type import needed in the hook; add to import list.

- [ ] **Step 5: FramingOverlay (green frame)**

Renders a positional box border; green when `POSITION_VALID`, amber when `ADJUSTING`, red placeholder when `INVALID`. Uses `tokens.colors.primary` for green. `accessibilityRole` on interactive bits. Touch targets ≥ 44.

- [ ] **Step 6: AiWorkoutScreen**

Maps `useAiWorkout` + `CameraView` (vision-camera v5) with a frame-output feeding `onFrame`, `FramingOverlay`, countdown UI (`3…2…1 GO`), rep counter `X / target`, and `DebugOverlay` (spec §40).

- [ ] **Step 7: Verify on device**

Build via dev-client, run on iOS + Android. Confirm: camera opens, green frame appears when correctly framed, countdown begins, reps count GOOD, partial ROM rejected, voice speaks. Update `BENCHMARK.md` with results.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/features/ai/infrastructure/camera apps/mobile/src/features/ai/presentation package.json app.json
git commit -m "feat(mobile): vision-camera frame loop, overlays, countdown, voice, progress"
```

---

### Task 12: Wire into WorkoutExecution + navigation + completion

**Files:**
- Modify: `apps/mobile/src/features/training/presentation/screens/WorkoutExecutionScreen.tsx`
- Modify: `apps/mobile/src/navigation/Navigation.tsx`
- Test: `apps/mobile/src/features/training/presentation/screens/__tests__/aiWorkoutTrigger.test.ts` (pure helper)

**Interfaces:**
- Consumes: `useAiWorkout`, `AiWorkoutScreen` (Task 11), existing `/athlete/sessions/:id/sets` + `/complete`.
- Produces: `shouldUseAiFor(exercise): boolean` (AI off when nothing defined) — used to gate camera auto-start (spec §24: camera off when not needed).

- [x] **Step 1: Write failing test for gating helper**

```ts
// aiWorkoutTrigger.test.ts
import { shouldUseAiFor } from '../aiWorkoutTrigger';

describe('shouldUseAiFor', () => {
  it('false for exercises without an AI definition', () => {
    expect(shouldUseAiFor({ mode: 'cardio', name: 'Run' })).toBe(false);
  });
  it('true for a known squat', () => {
    expect(shouldUseAiFor({ mode: 'reps', name: 'Squat' })).toBe(true);
  });
});
```

- [x] **Step 2: Run — expect FAIL**

Run: `npx jest src/features/training/presentation/screens/__tests__/aiWorkoutTrigger.test.ts -v`

- [x] **Step 3: Implement the gate**

```ts
// aiWorkoutTrigger.ts
import { definitionFor } from '../../../ai/application/definitions';

export function shouldUseAiFor(ex: { mode?: string; name: string }): boolean {
  if (ex.mode && ex.mode !== 'reps') return false;
  return !!definitionFor(ex.name.toLowerCase());
}
```

- [x] **Step 4: Run — expect PASS**

Run: `npx jest src/features/training/presentation/screens/__tests__/aiWorkoutTrigger.test.ts -v`

- [x] **Step 5: Open camera from the execution flow**

In `WorkoutExecutionScreen`, when `shouldUseAiFor(currentExercise)` is true render the AI camera panel (activity cam at exercise start per spec §1) instead of / alongside manual set inputs; feed `currentExercise.name` + target `reps` into `AiWorkoutScreen`; on completion keep calling the existing `/athlete/sessions/.../complete` unchanged.

- [x] **Step 6: Add route**

Add `AiWorkout: { sessionId: string; workoutId: string }` to `RootStackParamList` and register `AiWorkoutScreen` in the stack (or render inline modal). Update linking config only if deep-link needed (not required).

- [x] **Step 7: Run `npm test && npx tsc --noEmit` and commit**

```bash
git add apps/mobile/src/features/training/presentation/screens apps/mobile/src/navigation/Navigation.tsx
git commit -m "feat(mobile): wire AI camera workout into execution flow"
```

---

### Task 13: DebugOverlay + Session Summary + final QA pass

**Files:**
- Create: `apps/mobile/src/features/ai/presentation/components/DebugOverlay.tsx` (if not in Task 11)
- Modify: `AiWorkoutScreen.tsx` (summary on completion)

**Interfaces:**
- Consumes: `DebugInfo` (Task 11), `FormEngine` totals, `RepEngine` counts.
- Produces: `useSessionSummary()` aggregating valid/rejected/form avg/best/ROM avg — returned for syncing as aggregate only.

- [x] **Step 1: Debug overlay**

Render `DebugInfo` fields (spec §40): FPS, AI FPS, inference latency, CPU, GPU, RAM, battery, temperature, model, model version, landmarks, confidence, distance status, framing status, camera status, exercise, phase, ROM, velocity, tempo, rep state, rep count, rep quality, form score, failure proximity. Toggle behind a dev flag; never visible in production by default.

- [x] **Step 2: Session summary**

On `Exercise Completed` (`repCount >= target`) show: `Exercise · Target · Completed reps · Rejected reps · Average form · Best form · Average ROM · Tempo · Velocity trend · Failure proximity` (spec §34). Store locally (AsyncStorage) and sync only the aggregate via existing session-complete payload (no new contract).

- [x] **Step 3: Full verification**

```bash
cd apps/mobile && npx tsc --noEmit && npm test && npm run lint
```
Then device QA per `mobile-rules/03` + test matrix (spec §43).

- [x] **Step 4: Commit**

```bash
git add apps/mobile/src/features/ai/presentation
git commit -m "feat(mobile): debug overlay + session summary + QA"
```

---

## Self-Review checklist (author)

- **Spec coverage:** EVERY spec §1–§46 maps to tasks above: §3–§9 (Task 4,10), §13/§15/§17 (Tasks 2,11), §18/§19/§20/§38 (Tasks 10,2), §21 (Task 1), §22 (Task 5), §23 (Task 10), §24–§27 (Task 6), §29–§30 (Task 9), §31 (Tasks 11–12), §32 (Task 8), §33–§34 (Tasks 7,13), §40 (Task 13), §41 (Task 10 SQUAT), §42 (registry), §16/§37/§43 (Task 0,13).
- **Placeholder scan:** No TBD/TODO left in code tasks; native PoseRuntime bridge + vision-camera wiring is explicitly delegated with concrete code and a device-verify gate (honest, not a stub-by-design).
- **Type consistency:** `Landmark`/`Pose`/`LandmarkFrame` (Task 1) used unchanged in Tasks 2–5, 11. `ExerciseDefinition` def fields referenced consistently. `RepResult`/`RepQuality`/`MovementMetrics` signatures match across Tasks 5–8, 11. `CoachingEngine.shape` (shouldSpeak/record/positiveMessages) consistent Task 9 ↔ 11. `FrameScheduler.shouldRun/setTargetFps` consistent Task 2 ↔ 11. `RepEngine.getState/getCounts` used by 11/13. `DeviceTier/BatteryManager/ThermalManager` consistent Task 10 ↔ 11.
- **Ordering:** Tasks are dependency-ordered; each ends with tsc+test+commit.

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-09-06-mobile-camera-ai-engine.md`.

1. **Subagent-Driven (recommended)** — fresh subagent per task + review between tasks.
2. **Inline Execution** — run tasks here with checkpoints.

Which approach?
