import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  computeBackoffMs,
  createCorrelationId,
  createIdempotencyKey,
  isRetryableAxiosConfig,
  isTransientAxiosError,
  resetDefaultMobileApiBreaker,
  setHeaderIfMissing,
} from '../resilience';

describe('Mobile API resilience utilities', () => {
  beforeEach(() => {
    resetDefaultMobileApiBreaker();
  });

  it('transitions CircuitBreaker CLOSED -> OPEN -> HALF_OPEN -> CLOSED and re-opens on probe failure', () => {
    let nowMs = 1_000;
    const transitions: string[] = [];
    const breaker = new CircuitBreaker({
      name: 'mobile_test',
      failureThreshold: 3,
      resetTimeoutMs: 2_000,
      halfOpenMaxCalls: 2,
      now: () => nowMs,
      onStateChange: (from, to) => transitions.push(`${from}->${to}`),
    });

    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('CLOSED');
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');
    expect(() => breaker.allow()).toThrow(CircuitBreakerOpenError);

    nowMs += 2_000;
    expect(breaker.getState()).toBe('HALF_OPEN');

    breaker.allow();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');

    nowMs += 2_000;
    breaker.allow();
    breaker.recordSuccess();
    breaker.allow();
    breaker.recordSuccess();
    expect(breaker.getState()).toBe('CLOSED');
    expect(transitions).toEqual([
      'CLOSED->OPEN',
      'OPEN->HALF_OPEN',
      'HALF_OPEN->OPEN',
      'OPEN->HALF_OPEN',
      'HALF_OPEN->CLOSED',
    ]);
  });

  it('classifies transient vs permanent Axios errors accurately', () => {
    expect(isTransientAxiosError({ response: { status: 503 } })).toBe(true);
    expect(isTransientAxiosError({ response: { status: 500 } })).toBe(true);
    expect(isTransientAxiosError({ response: { status: 429 } })).toBe(true);
    expect(isTransientAxiosError({ response: { status: 408 } })).toBe(true);
    expect(isTransientAxiosError({ code: 'ECONNABORTED' })).toBe(true);
    expect(isTransientAxiosError(new Error('Network Error'))).toBe(true);

    expect(isTransientAxiosError({ response: { status: 400 } })).toBe(false);
    expect(isTransientAxiosError({ response: { status: 401 } })).toBe(false);
    expect(isTransientAxiosError({ response: { status: 403 } })).toBe(false);
    expect(isTransientAxiosError({ response: { status: 404 } })).toBe(false);
    expect(isTransientAxiosError({ response: { status: 409 } })).toBe(false);
    expect(isTransientAxiosError({ response: { status: 422 } })).toBe(false);
    expect(isTransientAxiosError({ code: 'ERR_CANCELED' })).toBe(false);
    expect(isTransientAxiosError(new CircuitBreakerOpenError('mobile'))).toBe(false);
  });

  it('allows retries for safe methods or requests carrying Idempotency-Key', () => {
    expect(isRetryableAxiosConfig({ method: 'GET' })).toBe(true);
    expect(isRetryableAxiosConfig({ method: 'head' })).toBe(true);
    expect(isRetryableAxiosConfig({ method: 'POST', headers: {} })).toBe(false);
    expect(
      isRetryableAxiosConfig({
        method: 'POST',
        headers: { 'Idempotency-Key': 'abc-123' },
      })
    ).toBe(true);
  });

  it('attaches headers without overwriting existing ones and computes bounded jitter backoff', () => {
    const headers: Record<string, string> = { 'X-Correlation-ID': 'existing-corr' };
    setHeaderIfMissing(headers, 'X-Correlation-ID', createCorrelationId());
    setHeaderIfMissing(headers, 'Idempotency-Key', createIdempotencyKey());

    expect(headers['X-Correlation-ID']).toBe('existing-corr');
    expect(headers['Idempotency-Key']).toBeTruthy();

    expect(computeBackoffMs(0, 200, 1_000, () => 0)).toBe(100);
    expect(computeBackoffMs(0, 200, 1_000, () => 1)).toBe(200);
    expect(computeBackoffMs(4, 200, 1_000, () => 1)).toBe(1_000);
  });
});
