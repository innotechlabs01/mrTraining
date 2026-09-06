# Mobile Camera AI Engine — Architecture & Benchmark Design

**Date:** 2026-09-06
**Status:** Draft — pending review before implementation
**Scope:** `apps/mobile` only. AI Camera-Guided Workout (spec §1–§46). Start: SQUAT end-to-end.

---

## 1. Goal

Turn `WorkoutExecutionScreen` into an AI camera-guided workout:

```
Workout → Exercise → Camera → Position valid (green frame) → Countdown
       → Pose → Movement → Rep → Form → GOOD/REGULAR/BAD → Voice
       → Workout Progress → Completion
```

On-device, offline-first, iOS + Android. Good rep counts, BAD/UNKNOWN/INVALID do not.

---

## 2. Reality check (verified against repo)

Cannot build on assumptions. These are facts from `apps/mobile`:

| Claim | Reality |
|---|---|
| Framework | Expo 54 + **dev-client** (not pure RN CLI as `00-mobile-architecture.md` claims). `app.json`, `.expo`, `eas.json` prove it. |
| On-device stack ready | `react-native-nitro-modules ^0.37`, `react-native-worklets ^0.5`, `react-native-reanimated ~4.1`, `expo-av` (video demo only). |
| Camera / pose / ML | **None installed.** Greenfield. |
| State/persist | TanStack Query 5 + `AsyncStorage` (not Zustand/MMKV as AGENTS claims). No `zustand`, no `mmkv`, no `flashlist` in `package.json`. |
| Workout flow | `WorkoutExecutionScreen.tsx:88` logs sets **manually** (weight/reps/sec/RIR). No `ExerciseDefinition`, no camera, no counter. |
| Exercise model (mobile) | flat `{ id, name, sets, reps, weightKg, mode, perSide, sec }`. No camera/movement/rep/form rules. |
| Navigation | native-stack, typed `RootStackParamList`, `WorkoutExecution` route exists. |
| Server state / offline | `axios` + React Query persist to AsyncStorage. Works offline. |
| Auth | Clerk Expo, already wired. |
| Design tokens | single accent Electric Green `#16E37A`, dark-first, touch target 48, no emoji icons (SVG only). |

**Divergence note:** `09-ai-specification.md` governs only server-side LLM (workout gen, insights, anomaly). It does **not** cover on-device camera pose. This is a new subsystem, designed in parallel, local-first per spec §35–§36 (no video uploads, aggregate results only).

---

## 3. Model & runtime strategy (the "bench")

The spec (§14, §45) forbids assuming YOLO/HuggingFace/CoreML/TFLite. The decision must come from benchmark. Two parts: **desk research (this doc)** then **real device harness (Phase 0, mandatory before lock-in)**.

### 3.1 Candidate pose runtimes

Scaled by readiness for RN 0.81 + Expo dev-client + Nitro + offline:

| Runtime | Model | Landmarks | iOS | Android | Offline | Maintenance risk | Integration effort |
|---|---|---|---|---|---|---|---|
| **MediaPipe Tasks Vision — Pose Landmarker** | BlazePose (full-body, 33 lm) | 33 + `visibility` + `presence` + `x,y,z` | native | native | yes | **Low (actively maintained by Google)** | Medium (Nitro bridge / frame-processor) |
| `@react-native-ml-kit/pose-detection` | MLKit Pose / Apple Vision | 33 | Vision wrapper | MLKit wrapper | yes | **High — Google deprecated ML Kit Pose (2024)** | Low (one-surface wrapper) |
| Raw Vision (iOS) + MLKit (Android) | — | 33 | native | native | yes | Medium | **High — two codebases** |
| CoreML / TFLite custom | — | — | mix | mix | yes | High | High, no free model |

**Recommendation for v1:** **MediaPipe Pose Landmarker** as primary. Front-running (nicely): cross-platform single `.task` model, 33 landmarks with per-point `visibility` exactly matching spec §21, actively maintained, fully offline. Run it behind a `PoseRuntime` interface (spec §15) so a later swap to MLKit/Vision costs nothing downstream.

Fallback if MediaPipe wrapper friction exceeds a bound in Phase 0: `@react-native-ml-kit/pose-detection`, accepting the deprecation risk knowingly (guarded by the same `PoseRuntime` interface).

### 3.2 Camera layer

Use **`react-native-vision-camera` v5** (Nitro). It matches the installed stack (`react-native-nitro-modules`, worklets, Reanimated 4). Modern API is `useCamera` + `useFrameOutput` + `react-native-vision-camera-worklets` (bridges into `react-native-worklets`). Provides 30 FPS source frames with a `Frame` we feed to pose; we dispose each frame (`try/finally`) per docs.

**Verify before install (Phase 0 blocker):** vision-camera v5 ↔ RN 0.81 ↔ Reanimated 4 compatibility matrix; confirm it supports Expo dev-client via config plugin (it does, but pin versions).

### 3.3 Benchmark harness (must run, not assumed)

Cannot measure FPS/battery/thermal from this shell — no device attached, no lib installed. Define the harness now, run in Phase 0 on the real matrix before locking the model:

Metrics (§37): inference latency · CPU · GPU · RAM · battery · temperature · FPS · dropped frames · accuracy.

Session lengths: 5 / 15 / 30 / 45 / 60 min (§37).

Device tiers (§38): `HIGH_END` · `MID_RANGE` · `LOW_END` — map to model selection, inference FPS, resolution, tracking strategy.

Accept: accuracy sufficient + mobile performance + low battery + low thermal. More FPS ≠ better (§16).

**Phase 0 exit gate:** recorded benchmark table across ≥1 iOS + ≥1 Android device, per tier, deciding pose runtime + target inference FPS. Only after this do we implement SQUAT against the locked runtime.

---

## 4. Architecture

Layers per spec §13, isolated so runtime swaps never touch upper engines:

```
Camera (vision-camera v5)
   ↓ Frame
FrameScheduler          ← throttles inference (skip frames, ~10–15 inf/s target, §17)
   ↓ Frame
PoseEngine
   ↓ Pose
PoseRuntime (interface) ← Native impl: MediaPipe Pose Landmarker (v1)
   ↓ LandmarkFrame []
LandmarkTracking         ← smoothing, confidence, predict (spec §18, §21)
   ↓
CameraPreparationEngine  ← person/distance/framing/orientation/lighting (§3–§9)
   ↓ gate: POSITION_VALID → green frame
MovementEngine           ← angles, ROM, velocity, tempo, symmetry (§22)
   ↓
ExerciseEngine           ← ExerciseDefinition+MovementRules+RepRules+FormRules (§23)
   ↓
RepEngine                ← state machine, validity, quality (§24–§27)
   ↓
FormEngine               ← 0–100 score, degradation (§33)
   ↓
FatigueEngine            ← near-failure, form trend (§32)
   ↓
CoachingEngine           ← voice + priority + cooldown + dedup (§29–§30)
```

### 4.1 Folder structure (feature-first, ≤250 lines/file per rules)

```
src/features/ai/
├── domain/
│   ├── Landmark.ts
│   ├── Pose.ts
│   ├── ExerciseDefinition.ts      # cameraOrientation, requiredBodyParts,
│   │                              # minimumVisibility, preferredDistance, framingRules
│   ├── MovementRules.ts
│   ├── RepState.ts                # IDLE→…→COMPLETED machine
│   ├── RepQuality.ts              # GOOD|REGULAR|BAD|UNKNOWN
│   └── CameraPositionStatus.ts    # POSITION_INVALID|ADJUSTING|VALID
├── application/
│   ├── FrameScheduler.ts
│   ├── CameraPreparationEngine.ts
│   ├── MovementEngine.ts
│   ├── ExerciseEngine.ts
│   ├── RepEngine.ts
│   ├── FormEngine.ts
│   ├── FatigueEngine.ts
│   └── CoachingEngine.ts
├── infrastructure/
│   └── pose/
│       ├── PoseRuntime.ts         # interface (swap point)
│       ├── MediaPipePoseRuntime.ts
│       └── (future) MlKitPoseRuntime.ts
└── presentation/
    ├── screens/AiWorkoutScreen.tsx
    ├── components/FramingOverlay.tsx   # positional box + green frame
    ├── components/RepCounterOverlay.tsx
    └── components/DebugOverlay.tsx     # spec §40
```

### 4.2 Key interfaces

```ts
interface Landmark { id: number; x: number; y: number; z: number; confidence: number; visibility: number; }

interface ExerciseDefinition {
  id: string;
  name: string;
  cameraOrientation: 'frontal' | 'lateral' | 'auto';
  requiredBodyParts: BodyPart[];     // ['head','shoulders','hips','knees','ankles']
  minimumVisibility: number;         // 0..1 per part
  preferredDistance: DistanceBand;   // via bbox/landmark spread, NOT cm
  framingRules: FramingRule[];
  movement: MovementRules;
  rep: RepRules;
  form: FormRules;
}
```

### 4.3 Distance & framing (spec §4–§6) — no fake cm

Distance inferred from body bounding box, landmark distribution, visible-body %, exercise requirements. States: `POSITION_INVALID → POSITION_ADJUSTING → POSITION_VALID`. Valid → green frame (visual, not text-only). Feedback strings e.g. `"Aléjate un poco"`, `"Coloca todo tu cuerpo dentro del cuadro"`.

### 4.4 Position lock (§9)

On `POSITION_VALID`, keep via tracking; only re-calibrate on significant movement, camera move, tracking loss, body leaves frame, exercise change, confidence drop.

### 4.5 Countdown (§10)

Start counter only after camera valid + person valid + landmarks valid + exercise valid.

### 4.6 Exercise validation (§11–§12)

Use `Workout currentExercise` as primary context (`ExerciseDefinition` selected from ID). Optional `EXERCISE_MISMATCH` guard if observed motion incompatible → do not count, voice e.g. `"Estamos haciendo sentadillas. Prepárate para bajar."`

### 4.7 Rep validity & quality (§24–§27)

Valid = movement completed + required ROM + required phases + sufficient confidence + correct exercise.
- `GOOD` → count + positive voice
- `REGULAR` → count + corrective voice
- `BAD` → no count + explain why
- `UNKNOWN` → no count (insufficient landmarks)

### 4.8 Smart resource management

- `FrameScheduler` (§17): sub-30 max-inference FPS.
- `Tracking` (§18): reuse last valid pose, re-infer on confidence drop / movement / occlusion / camera move.
- `ThermalManager` (§19) + `BatteryManager` (§20): reduce inference frequency → reduce resolution → longer tracking interval → lighter model. Evasive order from expo-battery (level/state) + iOS `ProcessInfo.thermalState` (small native bridge or lean helper). Never overspend battery/heat for FPS.
- `DeviceTier` (§38) drives defaults.

### 4.9 Voice coaching (§29–§30)

`CoachingEngine` = priority + cooldown + dedup + event filter. TTS via `expo-speech` (offline). Variety, no per-frame chatter, no repeated same message.

### 4.10 Integration with Workout Progress (§31)

Only `VALID+GOOD` and `VALID+REGULAR` advance the counter. Counter = live target (`X / 15`). On completion write existing `/athlete/sessions/:id/complete` path unchanged — contract untouched.

### 4.11 Session summary (§34) & privacy

Aggregate metrics locally (form avg/best, ROM avg, tempo, velocity trend, failure proximity, rejected reps). Sync only aggregate results. No video uploads (§36).

---

## 5. Implementation plan (SQUAT first — spec §41)

Ordered, each reviewable work unit:

1. **Phase 0 — Benchmark + runtime lock.** Set up harness, burn-in pose/bench on device matrix, record table, lock pose runtime + inference FPS. Do NOT skip.
2. **Phase 1 — Foundations.** `Landmark`/`Pose` domain, `PoseRuntime` + `MediaPipePoseRuntime`, `FrameScheduler`, vision-camera v5 frame loop with frame `dispose`.
3. **Phase 2 — Camera prep.** `CameraPreparationEngine`: detection, distance, framing, `POSITION_VALID` → green frame overlay. SQUAT `ExerciseDefinition`.
4. **Phase 3 — Rep pipeline.** `MovementEngine` → `ExerciseEngine` → `RepEngine` (state machine) → `FormEngine`. Rep validity + quality.
5. **Phase 4 — Coaching + progress.** `CoachingEngine` (voice), `FatigueEngine`, wire counter into `WorkoutProgress`, completion.
6. **Phase 5 — Resource + debug.** `ThermalManager`, `BatteryManager`, `DeviceTier`, `DebugOverlay`.
7. **Phase 6 — PUSH UP, then LUNGE** (reuse core via `ExerciseDefinition` plugins, §42).

Each phase ends with `npx tsc --noEmit && npm test`.

---

## 6. Test matrix (spec §43)

Correct position · too close · too far · wrong framing · wrong camera angle · low lighting · partial body · camera move · user leaves frame · multiple people · exercise mismatch · GOOD/REGULAR/BAD rep · partial ROM · very fast · very slow · landmark loss · occlusion · low battery · high temp · device tiers · long session (60 min).

Unit tests: rep state machine, form score, framing thresholds, coaching dedup/cooldown (pure logic). Device tests in Phase 0/6 via `mobile-rules/03-mobile-testing.md`.

---

## 7. Acceptance criteria (spec §44)

1. Workout activates camera on exercise start.
2. System detects user.
3. System validates distance + framing.
4. User gets position-correction instructions.
5. Correct position → GREEN state.
6. Exercise starts only when camera valid.
7. AI analyzes locally.
8–9. GOOD & REGULAR count.
10–12. BAD/UNKNOWN/INVALID do not.
13–16. Voice feedback per quality; BAD explains why.
17. Counter writes to Workout Progress.
18–19. Offline + on-device.
20–25. Battery/thermal/adaptive/no-waste/off-when-unused; iOS+Android.

---

## 8. Decision record

- **Camera:** `react-native-vision-camera` v5 (Nitro) — matches installed Nitro/worklets; version-pin vs RN 0.81 verified in Phase 0.
- **Pose v1:** MediaPipe Pose Landmarker behind `PoseRuntime`; fallback `@react-native-ml-kit/pose-detection` (accept deprecation knowingly, swappable).
- **Voice:** `expo-speech` (offline TTS).
- **Battery:** `expo-battery`. **Thermal:** iOS `ProcessInfo.thermalState` (thin native) + heuristic.
- **No new API contract** to web/backend; reuse `/athlete/sessions/*` completion; sync aggregates only.
- **Scope now:** SQUAT. PUSH UP, LUNGE later via `ExerciseDefinition` plugins.

## 9. Open risks

- vision-camera v5 ↔ RN 0.81 / Reanimated 4 compat — Phase 0.
- MediaPipe RN wrapper maturity — Phase 0 fallback path defined.
- Real thermal API cross-platform parity — thin native bridge may need a tiny custom module.
- Tokens: green `POSITION_VALID` frame uses existing accent `#16E37A` (no new accent).