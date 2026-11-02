import { act, renderHook } from '@testing-library/react-native';
import type { GpsPoint } from '../../hooks/useGpsTracking';
import { useGuidedRunningSession } from '../useGuidedRunningSession';

const mockPost = jest.fn();
const mockStop = jest.fn();
const mockStart = jest.fn();
const mockSetItem = jest.fn().mockResolvedValue(undefined);
const mockRemoveItem = jest.fn().mockResolvedValue(undefined);
let mockOnPoint: ((point: GpsPoint) => void) | undefined;
let mockPending: unknown = null;

jest.mock('../../hooks/useGpsTracking', () => ({
  useGpsTracking: (options: { onPoint: (point: GpsPoint) => void; enabled: boolean }) => {
    mockOnPoint = options.onPoint;
    return { isTracking: options.enabled, error: null, stopTracking: mockStop, startTracking: mockStart };
  },
}));
jest.mock('../../../../infrastructure/api/client', () => ({
  smartClient: { post: (...args: unknown[]) => mockPost(...args) },
}));
jest.mock('../../../../infrastructure/storage/mmkv', () => ({
  mmkvSetJson: (...args: unknown[]) => mockSetItem(...args),
  mmkvRemove: (...args: unknown[]) => mockRemoveItem(...args),
  userScopedKey: (key: string) => `${key}:athlete-1`,
  mmkvGetJson: () => mockPending,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPending = null;
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-01T12:00:00Z'));
  mockPost.mockResolvedValue({ data: { session_id: 'run-1' } });
});
afterEach(() => jest.useRealTimers());

it('counts elapsed time without a timer feedback loop and excludes pauses', () => {
  const { result } = renderHook(() => useGuidedRunningSession('run-1', true));
  act(() => jest.advanceTimersByTime(3000));
  expect(result.current.durationSeconds).toBe(3);
  act(() => result.current.togglePause());
  act(() => jest.advanceTimersByTime(5000));
  expect(result.current.durationSeconds).toBe(3);
  act(() => result.current.togglePause());
  act(() => jest.advanceTimersByTime(2000));
  expect(result.current.durationSeconds).toBe(5);
});

it('persists real GPS distance and duration before reporting success, without duplicate finish', async () => {
  const { result } = renderHook(() => useGuidedRunningSession('run-1', true));
  act(() => {
    mockOnPoint?.({ latitude: 0, longitude: 0, timestamp: '2026-11-01T12:00:00Z' });
    mockOnPoint?.({ latitude: 0.001, longitude: 0, timestamp: '2026-11-01T12:00:30Z' });
    jest.advanceTimersByTime(30000);
  });
  await act(async () => { await Promise.all([result.current.finish(), result.current.finish()]); });
  expect(mockPost).toHaveBeenCalledTimes(1);
  const [url, payload] = mockPost.mock.calls[0];
  expect(url).toBe('/running/workouts/sessions/run-1/complete');
  expect(payload.duration).toBe(30);
  expect(payload.distance).toBeCloseTo(0.111, 2);
  expect(payload.gps_route.length).toBeGreaterThan(0);
  expect(mockSetItem).toHaveBeenCalled();
  expect(mockRemoveItem).toHaveBeenCalled();
});

it('retains a failed completion for retry and does not claim success', async () => {
  mockPost.mockRejectedValueOnce(new Error('offline'));
  const { result } = renderHook(() => useGuidedRunningSession('run-1', true));
  await act(async () => { expect(await result.current.finish()).toBe(false); });
  expect(result.current.saveError).toBeTruthy();
  expect(mockRemoveItem).not.toHaveBeenCalled();
  await act(async () => { expect(await result.current.finish()).toBe(true); });
  expect(mockPost).toHaveBeenCalledTimes(2);
});

it('restores an unsent completion after remount instead of replacing it with zeros', async () => {
  mockPending = { distance: 5, duration: 1500, pace: '5:00', calories: 0,
    elevation: 0, heart_rate: 0, cadence: 0, gps_route: 'encoded-route' };
  const { result } = renderHook(() => useGuidedRunningSession('run-1', true));
  expect(result.current.isPaused).toBe(true);
  expect(result.current.distanceKm).toBe(5);
  await act(async () => { expect(await result.current.finish()).toBe(true); });
  expect(mockPost.mock.calls[0][1]).toEqual(mockPending);
});
