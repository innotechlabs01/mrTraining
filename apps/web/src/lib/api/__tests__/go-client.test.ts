import { GoApiError, goFetch } from '../go-client';
import { CircuitBreakerOpenError, resetDefaultGoApiBreaker } from '../resilience';
import { shouldFallbackToNextApi } from '@/features/shared/api/client';

function makeResponse(status: number, body: unknown = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
    blob: async () => new Blob([JSON.stringify(body)]),
  } as unknown as Response;
}

describe('goFetch & shouldFallbackToNextApi', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetDefaultGoApiBreaker();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete (window as unknown as { Clerk?: unknown }).Clerk;
  });

  it('propagates GoApiError with HTTP status code instead of generic Error', async () => {
    global.fetch = jest.fn().mockResolvedValue(makeResponse(403, { error: 'forbidden coach' })) as unknown as typeof fetch;

    await expect(goFetch('/api/v1/coaches/me/athletes', { auth: false })).rejects.toMatchObject({
      name: 'GoApiError',
      status: 403,
      message: 'forbidden coach',
    });
  });

  it('attaches X-Correlation-ID and auto Idempotency-Key once per mutable request', async () => {
    const fetchMock = jest.fn().mockResolvedValue(makeResponse(201, { id: 'w1' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await goFetch<{ id: string }>('/api/v1/workouts/assign', {
      auth: false,
      method: 'POST',
      body: JSON.stringify({ name: 'Threshold' }),
    });

    expect(result).toEqual({ id: 'w1' });
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['X-Correlation-ID']).toBeTruthy();
    expect(headers['Idempotency-Key']).toBeTruthy();
  });

  it('refreshes Clerk token once on 401 when fresh token differs', async () => {
    const getToken = jest
      .fn()
      .mockResolvedValueOnce('expired-jwt')
      .mockResolvedValueOnce('fresh-jwt');
    (window as unknown as { Clerk: unknown }).Clerk = {
      session: { getToken },
    };

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(makeResponse(401, { error: 'unauthorized' }))
      .mockResolvedValueOnce(makeResponse(200, { ok: true }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const data = await goFetch<{ ok: boolean }>('/api/v1/users/me', { auth: true });
    expect(data).toEqual({ ok: true });
    expect(getToken).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const retryHeaders = (fetchMock.mock.calls[1][1] as RequestInit).headers as Record<string, string>;
    expect(retryHeaders['Authorization']).toBe('Bearer fresh-jwt');
  });

  it('shouldFallbackToNextApi returns true only for GET/HEAD 404 or 501', () => {
    expect(shouldFallbackToNextApi(new GoApiError('not found', 404), 'GET')).toBe(true);
    expect(shouldFallbackToNextApi(new GoApiError('not implemented', 501), 'get')).toBe(true);
    expect(shouldFallbackToNextApi(new GoApiError('not found', 404), 'HEAD')).toBe(true);

    expect(shouldFallbackToNextApi(new GoApiError('not found', 404), 'POST')).toBe(false);
    expect(shouldFallbackToNextApi(new GoApiError('not found', 404), 'PUT')).toBe(false);
    expect(shouldFallbackToNextApi(new GoApiError('not found', 404), 'DELETE')).toBe(false);

    expect(shouldFallbackToNextApi(new GoApiError('bad request', 400), 'GET')).toBe(false);
    expect(shouldFallbackToNextApi(new GoApiError('unauthorized', 401), 'GET')).toBe(false);
    expect(shouldFallbackToNextApi(new GoApiError('forbidden', 403), 'GET')).toBe(false);
    expect(shouldFallbackToNextApi(new GoApiError('conflict', 409), 'GET')).toBe(false);
    expect(shouldFallbackToNextApi(new GoApiError('validation', 422), 'GET')).toBe(false);
    expect(shouldFallbackToNextApi(new GoApiError('server error', 500), 'GET')).toBe(false);
    expect(shouldFallbackToNextApi(new GoApiError('unavailable', 503), 'GET')).toBe(false);

    expect(shouldFallbackToNextApi(new CircuitBreakerOpenError('go_api'), 'GET')).toBe(false);
    expect(shouldFallbackToNextApi(new Error('network down'), 'GET')).toBe(false);
  });
});
