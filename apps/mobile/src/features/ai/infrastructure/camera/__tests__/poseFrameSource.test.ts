import { poseFromFrame } from '../poseFrameSource';
import type { PoseRuntime } from '../../pose/PoseRuntime';
import type { LandmarkFrame, Landmark } from '../../../domain/Landmark';

const runtimeWith = (result: LandmarkFrame | null): PoseRuntime => ({
  detect: () => result,
});

describe('poseFromFrame', () => {
  it('returns not detected for a null runtime result', () => {
    const pose = poseFromFrame({}, runtimeWith(null));
    expect(pose.detected).toBe(false);
    expect(pose.landmarks).toHaveLength(0);
    expect(pose.confidence).toBe(0);
  });

  it('returns not detected for an empty landmark list', () => {
    const pose = poseFromFrame({}, runtimeWith({ landmarks: [], timestamp: 100 }));
    expect(pose.detected).toBe(false);
    expect(pose.confidence).toBe(0);
  });

  it('marks detected and averages visibility for a full frame', () => {
    const lm: Landmark[] = [
      { x: 0.5, y: 0.2, z: 0, confidence: 0.9, visibility: 0.8 },
      { x: 0.5, y: 0.4, z: 0, confidence: 0.9, visibility: 0.6 },
    ];
    const pose = poseFromFrame({}, runtimeWith({ landmarks: lm, timestamp: 100 }));
    expect(pose.detected).toBe(true);
    expect(pose.landmarks).toEqual(lm);
    expect(pose.confidence).toBeCloseTo(0.7, 6);
  });
});