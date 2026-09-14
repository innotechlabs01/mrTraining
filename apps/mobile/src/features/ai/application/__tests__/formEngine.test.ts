import { FormEngine } from '../FormEngine';
import type { ExerciseDefinition } from '../../domain/RepTypes';
import type { RepResult } from '../RepEngine';
import type { MovementMetrics } from '../MovementEngine';

const formRules = { kneeValgusToleranceDeg: 10, minKneeForGoodDeg: 90, maxLateralSway: 0.08, minSymmetry: 0.85 };

function makeDef(formOverrides: Partial<typeof formRules> = {}): ExerciseDefinition {
  return {
    form: { ...formRules, ...formOverrides },
  } as unknown as ExerciseDefinition;
}

function makeResult(overrides: Partial<RepResult> = {}): RepResult {
  return {
    state: 'COMPLETED' as RepResult['state'],
    counted: true,
    quality: 'GOOD',
    validity: 'VALID',
    reason: null,
    romKneeDeg: 80,
    repStartMs: 0,
    ...overrides,
  };
}

describe('FormEngine', () => {
  it('scores a clean deep rep high', () => {
    const eng = new FormEngine();
    const sample: MovementMetrics = { kneeAngleDeg: 80, hipDrop: 1.2, velocityDegPerSec: 100, symmetry: 0.95, lateralSway: 0.02 };
    const m: RepResult = { state: 'COMPLETED' as RepResult['state'], counted: true, quality: 'GOOD', validity: 'VALID', reason: null, romKneeDeg: 80, repStartMs: 0 };
    const r = eng.scoreRep(m, [sample], { form: formRules } as unknown as ExerciseDefinition);
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.quality).toBe('GOOD');
  });

  it('returns score 0 and UNKNOWN quality for empty samples', () => {
    const eng = new FormEngine();
    const r = eng.scoreRep(makeResult(), [], makeDef());
    expect(r.score).toBe(0);
    expect(r.quality).toBe('UNKNOWN');
  });

  it('penalizes high lateral sway', () => {
    const eng = new FormEngine();
    const highSway: MovementMetrics = { kneeAngleDeg: 90, hipDrop: 0, velocityDegPerSec: 0, symmetry: 0.95, lateralSway: 0.18 };
    const clean: MovementMetrics = { kneeAngleDeg: 90, hipDrop: 0, velocityDegPerSec: 0, symmetry: 0.95, lateralSway: 0.02 };
    const rHigh = eng.scoreRep(makeResult(), [highSway], makeDef());
    const eng2 = new FormEngine();
    const rClean = eng2.scoreRep(makeResult(), [clean], makeDef());
    expect(rHigh.score).toBeLessThan(rClean.score);
  });

  it('penalizes low symmetry', () => {
    const eng = new FormEngine();
    const lowSym: MovementMetrics = { kneeAngleDeg: 80, hipDrop: 0, velocityDegPerSec: 0, symmetry: 0.65, lateralSway: 0.02 };
    const highSym: MovementMetrics = { kneeAngleDeg: 80, hipDrop: 0, velocityDegPerSec: 0, symmetry: 0.95, lateralSway: 0.02 };
    const rLow = eng.scoreRep(makeResult(), [lowSym], makeDef());
    const eng2 = new FormEngine();
    const rHigh = eng2.scoreRep(makeResult(), [highSym], makeDef());
    expect(rLow.score).toBeLessThan(rHigh.score);
  });

  it('gives a depth bonus for below-minimum knee angle', () => {
    const shallow: MovementMetrics = { kneeAngleDeg: 88, hipDrop: 0, velocityDegPerSec: 0, symmetry: 0.95, lateralSway: 0.02 };
    const deep: MovementMetrics = { kneeAngleDeg: 75, hipDrop: 0, velocityDegPerSec: 0, symmetry: 0.95, lateralSway: 0.02 };
    const eng1 = new FormEngine();
    const rShallow = eng1.scoreRep(makeResult(), [shallow], makeDef());
    const eng2 = new FormEngine();
    const rDeep = eng2.scoreRep(makeResult(), [deep], makeDef());
    expect(rDeep.score).toBeGreaterThanOrEqual(rShallow.score);
  });

  it('uses worst metric across multiple samples', () => {
    const clean: MovementMetrics = { kneeAngleDeg: 80, hipDrop: 0, velocityDegPerSec: 0, symmetry: 0.95, lateralSway: 0.02 };
    const badSway: MovementMetrics = { kneeAngleDeg: 80, hipDrop: 0, velocityDegPerSec: 0, symmetry: 0.95, lateralSway: 0.15 };
    const eng = new FormEngine();
    const r = eng.scoreRep(makeResult(), [clean, badSway], makeDef());
    const eng2 = new FormEngine();
    const rSingle = eng2.scoreRep(makeResult(), [badSway], makeDef());
    expect(r.score).toBe(rSingle.score);
  });

  it('tracks maxScore across multiple reps', () => {
    const eng = new FormEngine();
    const good: MovementMetrics = { kneeAngleDeg: 80, hipDrop: 0, velocityDegPerSec: 0, symmetry: 0.95, lateralSway: 0.02 };
    const mediocre: MovementMetrics = { kneeAngleDeg: 80, hipDrop: 0, velocityDegPerSec: 0, symmetry: 0.88, lateralSway: 0.04 };
    const r1 = eng.scoreRep(makeResult(), [mediocre], makeDef());
    expect(r1.maxScore).toBe(r1.score);
    const r2 = eng.scoreRep(makeResult(), [good], makeDef());
    expect(r2.maxScore).toBeGreaterThanOrEqual(r1.maxScore);
    expect(r2.maxScore).toBe(r2.score);
  });

  it('tracks avgScore across multiple reps', () => {
    const eng = new FormEngine();
    const s1: MovementMetrics = { kneeAngleDeg: 80, hipDrop: 0, velocityDegPerSec: 0, symmetry: 0.95, lateralSway: 0.02 };
    const s2: MovementMetrics = { kneeAngleDeg: 80, hipDrop: 0, velocityDegPerSec: 0, symmetry: 0.88, lateralSway: 0.04 };
    const r1 = eng.scoreRep(makeResult(), [s1], makeDef());
    const r2 = eng.scoreRep(makeResult(), [s2], makeDef());
    expect(r2.avgScore).toBe(Math.round((r1.score + r2.score) / 2));
  });

  it('tracks method does not throw', () => {
    const eng = new FormEngine();
    expect(() => eng.track({ kneeAngleDeg: 80, hipDrop: 0, velocityDegPerSec: 0, symmetry: 0.95, lateralSway: 0.02 })).not.toThrow();
  });

  it('maps score to GOOD, REGULAR and BAD', () => {
    // GOOD: clean metrics, no depth bonus
    const engGood = new FormEngine();
    const clean: MovementMetrics = { kneeAngleDeg: 90, hipDrop: 0, velocityDegPerSec: 0, symmetry: 0.95, lateralSway: 0.02 };
    const rGood = engGood.scoreRep(makeResult(), [clean], makeDef());
    expect(rGood.quality).toBe('GOOD');

    // REGULAR: noticeable but not extreme sway + asymmetry
    const engReg = new FormEngine();
    const mediocre: MovementMetrics = { kneeAngleDeg: 90, hipDrop: 0, velocityDegPerSec: 0, symmetry: 0.70, lateralSway: 0.12 };
    const rReg = engReg.scoreRep(makeResult(), [mediocre], makeDef());
    expect(rReg.quality).toBe('REGULAR');

    // BAD: extreme sway (hip well off-center) + strong asymmetry drops below 60
    const engBad = new FormEngine();
    const worst: MovementMetrics = { kneeAngleDeg: 80, hipDrop: 0, velocityDegPerSec: 0, symmetry: 0.50, lateralSway: 0.40 };
    const rBad = engBad.scoreRep(makeResult(), [worst], makeDef());
    expect(rBad.quality).toBe('BAD');
    expect(rBad.score).toBeLessThan(60);
  });

  it('kneeValgusToleranceDeg from form rules does not affect scoring', () => {
    const eng = new FormEngine();
    const m: MovementMetrics = { kneeAngleDeg: 80, hipDrop: 0, velocityDegPerSec: 0, symmetry: 0.95, lateralSway: 0.02 };
    const r1 = eng.scoreRep(makeResult(), [m], makeDef({ kneeValgusToleranceDeg: 1 }));
    const eng2 = new FormEngine();
    const r2 = eng2.scoreRep(makeResult(), [m], makeDef({ kneeValgusToleranceDeg: 100 }));
    expect(r1.score).toBe(r2.score);
  });
});
