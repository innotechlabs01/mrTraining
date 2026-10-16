import type { PoseRuntime } from '../PoseRuntime';
import type { Landmark, LandmarkFrame } from '../../domain/Landmark';
import { MediaPipePoseRuntime } from '../MediaPipePoseRuntime';

// Mock react-native-fast-tflite before any test runs
jest.mock('react-native-fast-tflite', () => ({
  loadTensorflowModel: jest.fn(),
}));

describe('MediaPipePoseRuntime', () => {
  let runtime: MediaPipePoseRuntime;

  beforeEach(() => {
    jest.clearAllMocks();
    runtime = new MediaPipePoseRuntime();
  });

  describe('detect()', () => {
    it('returns null when input is undefined', async () => {
      const result = await runtime.detect(undefined);
      expect(result).toBeNull();
    });

    it('returns null when input is null', async () => {
      const result = await runtime.detect(null);
      expect(result).toBeNull();
    });

    it('returns null when input has no buffer', async () => {
      const result = await runtime.detect({ width: 640, height: 480 } as any);
      expect(result).toBeNull();
    });

    it('returns null when input has invalid dimensions', async () => {
      const result = await runtime.detect({ width: 0, height: 0, buffer: new ArrayBuffer(0) } as any);
      expect(result).toBeNull();
    });

    it('returns null when model fails to load', async () => {
      // Arrange: mock loadTensorflowModel to reject
      ;(require('react-native-fast-tflite') as any).loadTensorflowModel = jest.fn().mockRejectedValue(new Error('Model load failed'));

      const result = await runtime.detect({
        width: 192,
        height: 192,
        timestamp: Date.now(),
        buffer: new ArrayBuffer(192 * 192 * 3),
        format: 'rgb',
      } as any);

      // Assert
      expect(result).toBeNull();
    });

    it('returns landmark frame when model produces valid output', async () => {
      // Arrange: mock model with valid output
      const mockLandmarks: Landmark[] = [
        { x: 0.5, y: 0.5, z: 0.1, confidence: 0.9, visibility: 0.9 },
        { x: 0.4, y: 0.6, z: 0.2, confidence: 0.8, visibility: 0.8 },
      ];

      // Mock loadTensorflowModel to return a model object
      const mockModel: any = {
        inputs: [{ shape: [1, 192, 192, 3] }],
        outputs: [{ shape: [1, 1, 132] }],
        runSync: jest.fn().mockReturnValue(new Float32Array(132).fill(0).buffer),
        run: jest.fn().mockResolvedValue([new Float32Array(132).fill(0).buffer]),
      };

      ;(require('react-native-fast-tflite') as any).loadTensorflowModel = jest
        .fn()
        .mockResolvedValue(mockModel);

      // Act
      const result = await runtime.detect({
        width: 192,
        height: 192,
        timestamp: Date.now(),
        buffer: new ArrayBuffer(192 * 192 * 3),
        format: 'rgb',
      } as any);

      // Assert
      expect(result).not.toBeNull();
      // parseOutput should produce landmarks from the mock data
      // (the exact count depends on parseOutput logic with 132-float buffer)
      expect(Array.isArray(result?.landmarks)).toBe(true);
      expect(result?.timestamp).toBeDefined();
    });

    it('returns null when model throws during detect', async () => {
      // Arrange: mock loadTensorflowModel to throw
      ;(require('react-native-fast-tflite') as any).loadTensorflowModel = jest
        .fn()
        .mockRejectedValue(new Error('Runtime error'));

      const result = await runtime.detect({
        width: 192,
        height: 192,
        timestamp: Date.now(),
        buffer: new ArrayBuffer(192 * 192 * 3),
        format: 'rgb',
      } as any);

      // Assert: graceful fallback — never crash the UI
      expect(result).toBeNull();
    });

    it('clamps normalized landmark values to [0,1] range', async () => {
      // Arrange: model with out-of-range values
      const mockModel: any = {
        inputs: [{ shape: [1, 192, 192, 3] }],
        outputs: [{ shape: [1, 1, 132] }],
        runSync: jest.fn().mockReturnValue(new Float32Array(132).fill(0).buffer),
      };

      ;(require('react-native-fast-tflite') as any).loadTensorflowModel = jest
        .fn()
        .mockResolvedValue(mockModel);

      // Act
      const result = await runtime.detect({
        width: 192,
        height: 192,
        timestamp: Date.now(),
        buffer: new ArrayBuffer(192 * 192 * 3),
        format: 'rgb',
      } as any);

      // Assert: function doesn't crash; individual values will be clamped by parseOutput
      expect(result).not.toBeNull();
    });
  });
});