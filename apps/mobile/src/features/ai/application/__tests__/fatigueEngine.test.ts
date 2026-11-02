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
