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

// Same layout as fullBody, horizontally scaled around x = 0.4 to control spread.
function scaledBody(scale: number): Landmark[] {
  const cx = 0.4;
  const pts: [number, number, number][] = [
    [0, 0.1, 1], [11, 0.3, 1], [12, 0.7, 1], [23, 0.35, 1], [24, 0.65, 1],
    [25, 0.4, 1], [26, 0.6, 1], [27, 0.42, 1], [28, 0.58, 1],
  ];
  const arr: Landmark[] = [];
  for (const [i, x, y] of pts) arr[i] = L(cx + (x - cx) * scale, y);
  return arr;
}

describe('assessBody', () => {
  it('marks all required parts visible when landmarks present', () => {
    const { visible, missing } = assessBody(fullBody(), squatDef());
    expect(missing).toHaveLength(0);
    expect(visible).toEqual(expect.arrayContaining(['head', 'shoulders', 'hips', 'knees', 'ankles']));
  });

  it('marks a part missing when its landmarks are absent', () => {
    const body = fullBody();
    delete body[27];
    delete body[28];
    const { visible, missing } = assessBody(body, squatDef());
    expect(missing).toEqual(['ankles']);
    expect(visible).not.toContain('ankles');
  });

  it('marks a part missing when visibility is below the threshold', () => {
    const body = fullBody();
    body[11] = L(0.3, 1, 0.4);
    body[12] = L(0.7, 1, 0.4);
    const { missing } = assessBody(body, squatDef());
    expect(missing).toEqual(['head', 'shoulders']);
  });
});

describe('prepare', () => {
  it('returns POSITION_VALID with no hint for a full, well-framed body', () => {
    const body = fullBody();
    const check = prepare({ landmarks: body, detected: true, confidence: 0.9 }, squatDef());
    expect(check.status).toBe('POSITION_VALID');
    expect(check.hint).toBeNull();
  });

  it('returns POSITION_INVALID with no-detection hint when pose is not detected', () => {
    const check = prepare({ landmarks: [], detected: false, confidence: 0 }, squatDef());
    expect(check.status).toBe('POSITION_INVALID');
    expect(check.hint).toBe('No te detecto. Entra en el cuadro.');
    expect(check.visibleParts).toHaveLength(0);
    expect(check.spread).toBe(0);
  });

  it('returns POSITION_INVALID with no-detection hint for empty landmarks', () => {
    const check = prepare({ landmarks: [], detected: true, confidence: 0.9 }, squatDef());
    expect(check.status).toBe('POSITION_INVALID');
    expect(check.hint).toBe('No te detecto. Entra en el cuadro.');
    expect(check.visibleParts).toHaveLength(0);
    expect(check.spread).toBe(0);
  });

  it('returns POSITION_INVALID with body-framing hint when a part is missing', () => {
    const body = fullBody();
    delete body[27];
    delete body[28];
    const check = prepare({ landmarks: body, detected: true, confidence: 0.9 }, squatDef());
    expect(check.status).toBe('POSITION_INVALID');
    expect(check.hint).toBe('Coloca todo tu cuerpo dentro del cuadro.');
    expect(check.visibleParts).toEqual(expect.not.arrayContaining(['ankles']));
    expect(check.spread).toBeGreaterThan(0);
  });

  it('returns POSITION_ADJUSTING with come-closer hint when spread is below the band', () => {
    const check = prepare({ landmarks: scaledBody(0.3), detected: true, confidence: 0.9 }, squatDef());
    expect(check.status).toBe('POSITION_ADJUSTING');
    expect(check.hint).toBe('Acércate un poco.');
    expect(check.spread).toBeLessThan(0.35);
  });

  it('returns POSITION_ADJUSTING with step-back hint when spread is above the band', () => {
    const check = prepare({ landmarks: scaledBody(1.6), detected: true, confidence: 0.9 }, squatDef());
    expect(check.status).toBe('POSITION_ADJUSTING');
    expect(check.hint).toBe('Aléjate un poco.');
    expect(check.spread).toBeGreaterThan(0.8);
  });

  it('returns POSITION_ADJUSTING with camera-tilt hint when a framing rule fails', () => {
    const def: ExerciseDefinition = {
      ...squatDef(),
      framingRules: [{ bodyPart: 'head', minVisibility: 0.8 }],
    };
    const body = fullBody();
    body[0] = L(0.1, 1, 0.7); // visible enough for assessBody (>= 0.5), not for framing (>= 0.8)
    const check = prepare({ landmarks: body, detected: true, confidence: 0.9 }, def);
    expect(check.status).toBe('POSITION_ADJUSTING');
    expect(check.hint).toBe('Coloca la cámara un poco más abajo.');
  });
});
