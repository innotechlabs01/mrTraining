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

  // Edge cases
  it('angleDeg returns 180 for zero-length vector', () => {
    expect(angleDeg(L(1, 1), L(1, 1), L(2, 2))).toBeCloseTo(180, 4);
    expect(angleDeg(L(0, 0), L(1, 0), L(1, 0))).toBeCloseTo(180, 4);
  });

  it('angleDeg returns 180 for collinear points', () => {
    expect(angleDeg(L(0, 0), L(1, 0), L(2, 0))).toBeCloseTo(180, 4);
  });

  it('angleDeg returns ~0 for overlapping rays', () => {
    expect(angleDeg(L(0, 0), L(1, 0), L(2, 0))).toBeCloseTo(180, 4);
  });

  it('angleDeg returns 180 when all three points coincide', () => {
    expect(angleDeg(L(0.5, 0.5), L(0.5, 0.5), L(0.5, 0.5))).toBeCloseTo(180, 4);
  });

  it('hipDropRatio returns 0 when knee equals ankle (zero denominator)', () => {
    const pt = L(0.5, 0.6);
    expect(hipDropRatio(pt, pt, pt)).toBeCloseTo(0, 4);
  });

  it('frameSpread returns 0 for empty array', () => {
    expect(frameSpread([])).toBe(0);
  });

  it('frameSpread returns 0 for single landmark', () => {
    expect(frameSpread([L(0.5, 0.5)])).toBeCloseTo(0, 4);
  });

  it('frameSpread returns 0 when all landmarks coincide', () => {
    expect(frameSpread([L(0.3, 0.3), L(0.3, 0.3), L(0.3, 0.3)])).toBeCloseTo(0, 4);
  });

  it('frameSpread picks the wider axis', () => {
    expect(frameSpread([L(0, 0), L(0.8, 0.2)])).toBeCloseTo(0.8, 4);
    expect(frameSpread([L(0, 0), L(0.2, 0.9)])).toBeCloseTo(0.9, 4);
  });

  it('avgMid with negative coordinates', () => {
    const m = avgMid(L(-0.2, -0.4), L(0.2, 0.4));
    expect(m.x).toBeCloseTo(0, 4);
    expect(m.y).toBeCloseTo(0, 4);
  });
});
