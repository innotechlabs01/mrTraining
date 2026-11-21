import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  fetchWithResilience,
  generateCorrelationId,
  isRetryableMethod,
  isTransientStatus,
  resetDefaultGoApiBreaker,
} from '../resilience';

function mockResponse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {}
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (key: string) => {
        const lower = key.toLowerCase();
        for (const [k, v] of Object.entries(headers)) {
          if (k.toLowerCase() === lower) return v;
        }
        return null;
      },
    },
    json: async () => body,
    blob: async () => new Blob([JSON.stringify(body)]),
  } as unknown as Response;
}

describe('CircuitBreaker', () => {
  it('opens after threshold failures and transitions to HALF_OPEN after resetTimeoutMs', () => {
    let nowMs = 1_000;
    const transitions: string[] = [];
    const breaker = new CircuitBreaker({
      name: 'test_breaker',
      failureThreshold: 3,
      resetTimeoutMs: 5_000,
      halfOpenMaxCalls: 2,
      now: () => nowMs,
      onStateChange: (from, to) => transitions.push(`${from}->${to}`),
    });

    expect(breaker.getState()).toBe('CLOSED');
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('CLOSED');
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');
    expect(() => breaker.allow()).toThrow(CircuitBreakerOpenError);

    nowMs += 5_000;
    expect(breaker.getState()).toBe('HALF_OPEN');

    breaker.allow();
    breaker.recordSuccess();
    expect(breaker.getState()).toBe('HALF_OPEN');
    breaker.allow();
    breaker.recordSuccess();
    expect(breaker.getState()).toBe('CLOSED');
    expect(transitions).toEqual(['CLOSED->OPEN', 'OPEN->HALF_OPEN', 'HALF_OPEN->CLOSED']);
  });

  it('re-opens immediately if a HALF_OPEN probe fails', () => {
    let nowMs = 1_000;
    const breaker = new CircuitBreaker({
      name: 'test_breaker',
      failureThreshold: 1,
      resetTimeoutMs: 1_000,
      halfOpenMaxCalls: 1,
      now: () => nowMs,
    });

    breaker.allow();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');

    nowMs += 1_000;
    breaker.allow();
    expect(breaker.getState()).toBe('HALF_OPEN');
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');
    expect(() => breaker.allow()).toThrow(CircuitBreakerOpenError);
  });
});

describe('fetchWithResilience', () => {
  beforeEach(() => {
    resetDefaultGoApiBreaker();
  });

  it('attaches X-Correlation-ID automatically and preserves caller correlation ID', async () => {
    const fetchFn = jest.fn().mockResolvedValue(mockResponse(200, { ok: true }));
    const breaker = new CircuitBreaker({ name: 'corr_test' });

    await fetchWithResilience('http://localhost/test', { method: 'GET' }, { fetchFn, breaker });
    const firstHeaders = (fetchFn.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(firstHeaders['X-Correlation-ID']).toBeTruthy();

    await fetchWithResilience(
      'http://localhost/test',
      { method: 'GET', headers: { 'X-Correlation-ID': 'caller-trace-99' } },
      { fetchFn, breaker }
    );
    const secondHeaders = (fetchFn.mock.calls[1][1] as RequestInit).headers as Record<string, string>;
    expect(secondHeaders['X-Correlation-ID']).toBe('caller-trace-99');
    expect(generateCorrelationId()).toBeTruthy();
  });

  it('retries transient 503 for GET with backoff and succeeds on third attempt', async () => {
    const sleeps: number[] = [];
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(mockResponse(503))
      .mockResolvedValueOnce(mockResponse(503))
      .mockResolvedValueOnce(mockResponse(200, { ok: true }));

    const breaker = new CircuitBreaker({ name: 'retry_get', failureThreshold: 5 });
    const res = await fetchWithResilience(
      'http://localhost/items',
      { method: 'GET' },
      {
        fetchFn,
        breaker,
        maxRetries: 2,
        baseDelayMs: 100,
        maxDelayMs: 1_000,
        sleepFn: async (ms) => {
          sleeps.push(ms);
        },
        randomFn: () => 0.5,
      }
    );

    expect(res.status).toBe(200);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleeps).toHaveLength(2);
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('retries POST only when Idempotency-Key header is present', async () => {
    const breaker = new CircuitBreaker({ name: 'retry_post', failureThreshold: 10 });
    const sleepFn = jest.fn().mockResolvedValue(undefined);

    const noKeyFetch = jest.fn().mockResolvedValue(mockResponse(503));
    const noKeyRes = await fetchWithResilience(
      'http://localhost/orders',
      { method: 'POST', body: '{}' },
      { fetchFn: noKeyFetch, breaker, maxRetries: 2, sleepFn }
    );
    expect(noKeyRes.status).toBe(503);
    expect(noKeyFetch).toHaveBeenCalledTimes(1);

    const withKeyFetch = jest
      .fn()
      .mockResolvedValueOnce(mockResponse(502))
      .mockResolvedValueOnce(mockResponse(201, { id: 'o1' }));
    const withKeyRes = await fetchWithResilience(
      'http://localhost/orders',
      {
        method: 'POST',
        headers: { 'Idempotency-Key': 'idem-key-1' },
        body: '{}',
      },
      { fetchFn: withKeyFetch, breaker, maxRetries: 2, sleepFn }
    );
    expect(withKeyRes.status).toBe(201);
    expect(withKeyFetch).toHaveBeenCalledTimes(2);
  });

  it('never retries or trips circuit breaker on non-429 client 4xx responses', async () => {
    const breaker = new CircuitBreaker({ name: 'non_trip_4xx', failureThreshold: 2 });
    const sleepFn = jest.fn().mockResolvedValue(undefined);
    const fetchFn = jest.fn().mockResolvedValue(mockResponse(404, { error: 'not found' }));

    for (let i = 0; i < 5; i += 1) {
      const res = await fetchWithResilience(
        'http://localhost/missing',
        { method: 'GET' },
        { fetchFn, breaker, maxRetries: 2, sleepFn }
      );
      expect(res.status).toBe(404);
    }

    expect(fetchFn).toHaveBeenCalledTimes(5);
    expect(sleepFn).not.toHaveBeenCalled();
    expect(breaker.getState()).toBe('CLOSED');
    expect(isTransientStatus(404)).toBe(false);
    expect(isTransientStatus(429)).toBe(true);
    expect(isRetryableMethod('POST')).toBe(false);
    expect(isRetryableMethod('POST', { 'idempotency-key': 'k1' })).toBe(true);
  });

  it('aborts hung requests via timeoutMs and opens breaker after threshold', async () => {
    const breaker = new CircuitBreaker({ name: 'timeout_test', failureThreshold: 2 });
    const fetchFn = jest.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    await expect(
      fetchWithResilience(
        'http://localhost/slow',
        { method: 'GET' },
        {
          fetchFn,
          breaker,
          timeoutMs: 15,
          maxRetries: 1,
          sleepFn: async () => undefined,
        }
      )
    ).rejects.toThrow(/aborted/i);

    expect(breaker.getState()).toBe('OPEN');
    await expect(
      fetchWithResilience('http://localhost/slow', { method: 'GET' }, { fetchFn, breaker })
    ).rejects.toBeInstanceOf(CircuitBreakerOpenError);
  });
});
