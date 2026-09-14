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