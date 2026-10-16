import type { PoseRuntime } from './PoseRuntime';
import type { Landmark, LandmarkFrame } from '../../domain/Landmark';
import { loadTensorflowModel } from 'react-native-fast-tflite';

/**
 * MediaPipe Pose Landmarker runtime backed by TensorFlow Lite BlazePose Lite model.
 *
 * Runs inference in the VisionCamera worklet thread (off the JS UI thread).
 * Returns real pose landmarks (33 BlazePose landmarks with normalized coordinates)
 * or null on error/unavailable.
 *
 * Key design decisions:
 * - Uses fast-tflite v3 Nitro Module API (compatible with Expo 57 / RN 0.86 New Arch)
 * - Model asset: pose_landmark_lite.tflite (2.8MB, 33 landmarks, input 192x192x3 RGB)
 * - Input: VisionCamera Frame buffer (RGB, from useFrameOutput{pixelFormat: 'rgb'})
 * - Output: LandmarkFrame {landmarks[33], timestamp} matching existing data contract
 * - All errors gracefully return null — never crashes the UI thread
 * - Resize from native camera resolution to model's 192x192 via nearest-neighbor JS worklet
 */
export class MediaPipePoseRuntime implements PoseRuntime {
  private model: ReturnType<typeof loadTensorflowModel> | null = null;
  private initialized = false;

  async detect(input: unknown): Promise<LandmarkFrame | null> {
    try {
      // Lazy model initialization on first call
      if (!this.initialized) {
        this.model = await loadTensorflowModel(
          // Assets are resolved by Metro from the project's assets/ directory
          // relative to the project root; the file must be in apps/mobile/assets/
          'assets/pose_landmark_lite.tflite',
          []
        );
        this.initialized = true;
      }

      if (!this.model) {
        return null;
      }

      // Type-cast input to VisionCamera Frame shape.
      // The project imports Frame from 'react-native-vision-camera' and uses
      // frame.width, frame.height, frame.timestamp, frame.buffer, frame.dispose().
      const frame = input as {
        width: number;
        height: number;
        timestamp: number;
        buffer: ArrayBuffer;
        format: string;
        dispose(): void;
      } | undefined;

      if (!frame || !frame.buffer || frame.width <= 0 || frame.height <= 0) {
        return { landmarks: [], timestamp: frame?.timestamp ?? Date.now() };
      }

      // Get model input tensor shape: BlazePose Lite expects [1, 192, 192, 3]
      // (batch=1, height=192, width=192, channels=3 RGB)
      const inputShape = (this.model as any).inputs[0].shape;
      const inputHeight = inputShape?.[1] ?? 192;
      const inputWidth = inputShape?.[2] ?? 192;

      // Resize frame buffer from native camera resolution to model input dimensions
      // using nearest-neighbor replication. Runs on worklet thread (off UI thread).
      const resizedBuffer = this.resizeFrameBuffer(
        frame.buffer,
        frame.width,
        frame.height,
        inputWidth,
        inputHeight
      );

      // Run inference synchronously via runSync (worklet-safe, no JS UI thread blocking).
      // runSync takes ArrayBuffer[] (one entry per input tensor) and returns ArrayBuffer[].
      const outputs = (this.model as any).runSync ? (
        (this.model as any).runSync([resizedBuffer])
      ) : await (this.model as any).run([resizedBuffer]);

      const outputBuffer = Array.isArray(outputs) ? outputs[0] : outputs;

      // Parse output landmarks from the TFLite output tensor.
      // BlazePose Lite output: [1, 1, 132] float32 = 33 landmarks × (x, y, z, visibility)
      const landmarkData = this.parseOutput(outputBuffer);

      return {
        landmarks: landmarkData,
        timestamp: frame.timestamp,
      };
    } catch (error) {
      // Graceful fallback — never crash the UI thread or block the workout interface.
      return null;
    }
  }

  /**
   * Resize an RGB pixel buffer from source dimensions to target dimensions
   * using nearest-neighbor replication. Runs on worklet thread (off UI thread).
   */
  private resizeFrameBuffer(
    buffer: ArrayBuffer,
    srcWidth: number,
    srcHeight: number,
    dstWidth: number,
    dstHeight: number
  ): ArrayBuffer {
    const src = new Uint8Array(buffer);
    const dstLength = dstWidth * dstHeight * 3;
    const dst = new Uint8Array(dstLength);

    const sxRatio = srcWidth / dstWidth;
    const syRatio = srcHeight / dstHeight;

    for (let y = 0; y < dstHeight; y++) {
      const srcY = Math.floor(y * syRatio * srcHeight);
      for (let x = 0; x < dstWidth; x++) {
        const srcX = Math.floor(x * sxRatio * srcWidth);
        const i = (srcY * srcWidth + srcX) * 3;
        const di = (y * dstWidth + x) * 3;
        dst[di] = src[i];     // R
        dst[di + 1] = src[i + 1]; // G
        dst[di + 2] = src[i + 2]; // B
      }
    }

    return dst.buffer;
  }

  /**
   * Parse the TFLite output tensor into 33 BlazePose landmarks.
   * Output tensor shape: [1, 1, 132] float32 (33 landmarks × 4 attrs: x, y, z, visibility)
   * Values are normalized to [0, 1] relative to image width/height.
   */
  private parseOutput(output: ArrayBuffer): Landmark[] {
    const data = new Float32Array(output);
    const landmarks: Landmark[] = [];

    // BlazePose Lite output: 33 landmarks × (x, y, z, visibility) = 132 floats
    const numLandmarks = 33;
    const attrsPerLandmark = 4;
    const expectedLength = numLandmarks * attrsPerLandmark; // 132

    if (data.length < expectedLength) {
      // Fallback: return empty landmarks rather than garbage data
      return [];
    }

    for (let i = 0; i < numLandmarks; i++) {
      const base = i * attrsPerLandmark;
      const x = data[base];
      const y = data[base + 1];
      const z = data[base + 2];
      const visibility = data[base + 3];

      // Clamp normalized values to [0, 1] range — out-of-range values indicate
      // model artifacts or corrupt frames; clamping prevents false positives.
      const clampedX = Math.min(Math.max(x, 0), 1);
      const clampedY = Math.min(Math.max(y, 0), 1);
      const clampedVis = Math.min(Math.max(visibility, 0), 1);

      landmarks.push({
        x: clampedX,
        y: clampedY,
        z: z !== z ? 0 : z, // NaN check: z may be NaN for some landmarks
        confidence: clampedVis,
        visibility: clampedVis,
      });
    }

    return landmarks;
  }
}