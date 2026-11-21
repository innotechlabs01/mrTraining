import {
  computeBatchIdempotencyKey,
  syncFormMetrics,
} from '../FormMetricsSync';
import { getAllMetrics, clearMetrics } from '../FormMetricsStorage';
import { smartClient } from '../../api/client';
import { CircuitBreakerOpenError } from '../../api/resilience';

jest.mock('../FormMetricsStorage', () => ({
  getAllMetrics: jest.fn(),
  clearMetrics: jest.fn(),
}));

jest.mock('../../api/client', () => ({
  smartClient: {
    post: jest.fn(),
  },
}));

const mockedGetAllMetrics = getAllMetrics as jest.MockedFunction<typeof getAllMetrics>;
const mockedClearMetrics = clearMetrics as jest.MockedFunction<typeof clearMetrics>;
const mockedPost = smartClient.post as jest.MockedFunction<typeof smartClient.post>;

const sampleMetrics = [
  {
    id: 'm-2',
    exerciseId: 'ex-1',
    exerciseName: 'Squat',
    workoutId: 'w-1',
    formScore: 90,
    depth: 95,
    alignment: 88,
    tempo: 87,
    timestamp: '2026-11-20T10:00:00Z',
  },
  {
    id: 'm-1',
    exerciseId: 'ex-1',
    exerciseName: 'Squat',
    workoutId: 'w-1',
    formScore: 92,
    depth: 94,
    alignment: 90,
    tempo: 91,
    timestamp: '2026-11-20T10:01:00Z',
  },
];

describe('FormMetricsSync resilience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('produces identical Idempotency-Key regardless of metric order', () => {
    const k1 = computeBatchIdempotencyKey(['m-1', 'm-2']);
    const k2 = computeBatchIdempotencyKey(['m-2', 'm-1']);
    expect(k1).toBe(k2);
    expect(k1).toMatch(/^fm-2-/);
  });

  it('short-circuits when no stored metrics exist', async () => {
    mockedGetAllMetrics.mockResolvedValue([]);
    const res = await syncFormMetrics({ sleepFn: async () => undefined });
    expect(res).toEqual({ synced: 0, failed: 0, errors: [] });
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('retries transient 503 with same Idempotency-Key and clears metrics on success', async () => {
    mockedGetAllMetrics.mockResolvedValue(sampleMetrics as never);
    mockedPost
      .mockRejectedValueOnce({ response: { status: 503 }, message: 'Unavailable' })
      .mockResolvedValueOnce({ data: { synced: 2 } } as never);

    const res = await syncFormMetrics({
      maxAttempts: 3,
      sleepFn: async () => undefined,
    });

    expect(res).toEqual({ synced: 2, failed: 0, errors: [] });
    expect(mockedPost).toHaveBeenCalledTimes(2);
    expect(mockedClearMetrics).toHaveBeenCalledTimes(1);

    const headersAttempt1 = (mockedPost.mock.calls[0][2] as { headers: Record<string, string> }).headers;
    const headersAttempt2 = (mockedPost.mock.calls[1][2] as { headers: Record<string, string> }).headers;
    expect(headersAttempt1['Idempotency-Key']).toBe(headersAttempt2['Idempotency-Key']);
    expect(headersAttempt1['X-Correlation-ID']).toBe(headersAttempt2['X-Correlation-ID']);
  });

  it('stops immediately without retry on non-transient 400 or CircuitBreakerOpenError', async () => {
    mockedGetAllMetrics.mockResolvedValue(sampleMetrics as never);
    mockedPost.mockRejectedValueOnce({ response: { status: 400 } });

    const r400 = await syncFormMetrics({
      maxAttempts: 3,
      sleepFn: async () => undefined,
    });
    expect(r400).toEqual({ synced: 0, failed: 2, errors: ['Server returned 400'] });
    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(mockedClearMetrics).not.toHaveBeenCalled();

    mockedPost.mockReset();
    mockedPost.mockRejectedValueOnce(new CircuitBreakerOpenError('mobile_go_api'));
    const rCb = await syncFormMetrics({
      maxAttempts: 3,
      sleepFn: async () => undefined,
    });
    expect(rCb.failed).toBe(2);
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it('coalesces overlapping syncFormMetrics calls under single-flight lock', async () => {
    mockedGetAllMetrics.mockResolvedValue(sampleMetrics as never);
    mockedPost.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: { synced: 2 } } as never), 20)
        )
    );

    const [a, b] = await Promise.all([
      syncFormMetrics({ sleepFn: async () => undefined }),
      syncFormMetrics({ sleepFn: async () => undefined }),
    ]);

    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ synced: 2, failed: 0, errors: [] });
    expect(b).toEqual({ synced: 2, failed: 0, errors: [] });
  });
});
