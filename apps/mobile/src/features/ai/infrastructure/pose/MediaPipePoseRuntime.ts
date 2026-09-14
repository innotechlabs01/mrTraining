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
