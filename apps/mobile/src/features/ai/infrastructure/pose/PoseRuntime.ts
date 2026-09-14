import type { LandmarkFrame } from '../../domain/Landmark';

/**
 * Swap point (spec §15): engines never depend on a concrete ML runtime.
 * `input` is opaque to engines — the native layer feeds a video frame.
 */
export interface PoseRuntime {
  detect(input: unknown): LandmarkFrame | null;
}
