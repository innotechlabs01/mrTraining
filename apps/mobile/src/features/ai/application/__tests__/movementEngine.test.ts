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
  it('computes true deg/sec velocity from frame delta', () => {
    const lm1: Landmark[] = [];
    lm1[ID.leftHip] = L(0.5, 0.3); lm1[ID.leftKnee] = L(0.5, 0.6); lm1[ID.leftAnkle] = L(0.5, 0.9);
    const lm2: Landmark[] = [];
    lm2[ID.leftHip] = L(0.5, 0.7); lm2[ID.leftKnee] = L(0.5, 0.6); lm2[ID.leftAnkle] = L(0.5, 0.9);
    const first = compute({ landmarks: lm1, timestamp: 1000 });
    const second = compute({ landmarks: lm2, timestamp: 2000 }, first);
    // 180 -> 90 over 1000 ms = 90 deg/sec
    expect(second.velocityDegPerSec).toBeCloseTo(90, 6);
  });
});
