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