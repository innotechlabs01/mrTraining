/**
 * Frontend HTTP transport resilience utilities:
 * - CircuitBreaker (CLOSED / OPEN / HALF_OPEN) that trips only on 429, 5xx, network errors, and timeouts
 * - Per-attempt AbortController timeout (default 10s)
 * - Exponential backoff with jitter for safe methods (GET/HEAD/OPTIONS) or requests carrying Idempotency-Key
 * - X-Correlation-ID header propagation
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  name?: string;
  failureThreshold?: number;
  resetTimeoutMs?: number;
  halfOpenMaxCalls?: number;
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
  now?: () => number;
}

export class CircuitBreakerOpenError extends Error {
  readonly status = 503;
  readonly breakerName: string;

  constructor(breakerName = 'go_api') {
    super(`Circuit breaker "${breakerName}" is OPEN; backend temporarily unavailable`);
    this.name = 'CircuitBreakerOpenError';
    this.breakerName = breakerName;
    Object.setPrototypeOf(this, CircuitBreakerOpenError.prototype);
  }
}

export class CircuitBreaker {
  readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxCalls: number;
  private readonly onStateChange?: (from: CircuitState, to: CircuitState) => void;
  private readonly now: () => number;

  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private openedAt = 0;
  private halfOpenInFlight = 0;
  private halfOpenSuccesses = 0;

  constructor(options: CircuitBreakerOptions = {}) {
    this.name = options.name ?? 'go_api';
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
    this.halfOpenMaxCalls = options.halfOpenMaxCalls ?? 2;
    this.onStateChange = options.onStateChange;
    this.now = options.now ?? (() => Date.now());
  }

  private transition(next: CircuitState): void {
    if (this.state === next) return;
    const prev = this.state;
    this.state = next;
    this.onStateChange?.(prev, next);
  }

  getState(): CircuitState {
    if (this.state === 'OPEN' && this.now() - this.openedAt >= this.resetTimeoutMs) {
      return 'HALF_OPEN';
    }
    return this.state;
  }

  canAttemptNow(): boolean {
    if (this.state === 'OPEN') {
      if (this.now() - this.openedAt < this.resetTimeoutMs) {
        return false;
      }
      return true;
    }
    if (this.state === 'HALF_OPEN') {
      return this.halfOpenInFlight < this.halfOpenMaxCalls;
    }
    return true;
  }

  allow(): void {
    if (this.state === 'OPEN') {
      if (this.now() - this.openedAt >= this.resetTimeoutMs) {
        this.halfOpenInFlight = 0;
        this.halfOpenSuccesses = 0;
        this.transition('HALF_OPEN');
      } else {
        throw new CircuitBreakerOpenError(this.name);
      }
    }

    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenInFlight >= this.halfOpenMaxCalls) {
        throw new CircuitBreakerOpenError(this.name);
      }
      this.halfOpenInFlight += 1;
    }
  }

  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenInFlight = Math.max(0, this.halfOpenInFlight - 1);
      this.halfOpenSuccesses += 1;
      if (this.halfOpenSuccesses >= this.halfOpenMaxCalls) {
        this.failures = 0;
        this.halfOpenSuccesses = 0;
        this.transition('CLOSED');
      }
      return;
    }
    this.failures = 0;
  }

  recordFailure(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenInFlight = Math.max(0, this.halfOpenInFlight - 1);
      this.halfOpenSuccesses = 0;
      this.openedAt = this.now();
      this.transition('OPEN');
      return;
    }

    this.failures += 1;
    if (this.failures >= this.failureThreshold) {
      this.openedAt = this.now();
      this.transition('OPEN');
    }
  }

  reset(): void {
    this.failures = 0;
    this.openedAt = 0;
    this.halfOpenInFlight = 0;
    this.halfOpenSuccesses = 0;
    this.state = 'CLOSED';
  }
}

export const defaultGoApiBreaker = new CircuitBreaker({
  name: 'go_api',
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxCalls: 2,
});

export function resetDefaultGoApiBreaker(): void {
  defaultGoApiBreaker.reset();
}

function randomId(prefix: string): string {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function generateCorrelationId(): string {
  return randomId('corr');
}

export function generateIdempotencyKey(): string {
  return randomId('idem');
}

export function headersToRecord(headers?: HeadersInit): Record<string, string> {
  const record: Record<string, string> = {};
  if (!headers) return record;

  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    headers.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }

  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      record[key] = value;
    }
    return record;
  }

  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      record[key] = String(value);
    }
  }
  return record;
}

export function findHeader(headers: Record<string, string>, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) {
      return value;
    }
  }
  return undefined;
}

export function isRetryableMethod(method?: string, headers?: HeadersInit): boolean {
  const normalized = (method ?? 'GET').toUpperCase();
  if (normalized === 'GET' || normalized === 'HEAD' || normalized === 'OPTIONS') {
    return true;
  }
  const record = headersToRecord(headers);
  const idempotencyKey = findHeader(record, 'Idempotency-Key');
  return typeof idempotencyKey === 'string' && idempotencyKey.trim().length > 0;
}

export function isTransientStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

export function parseRetryAfterMs(retryAfterHeader: string | null | undefined, maxDelayMs: number): number | null {
  if (!retryAfterHeader) return null;
  const trimmed = retryAfterHeader.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const seconds = Number(trimmed);
    if (!Number.isNaN(seconds) && Number.isFinite(seconds)) {
      return Math.min(maxDelayMs, Math.max(0, Math.round(seconds * 1000)));
    }
  }
  const parsedDate = Date.parse(trimmed);
  if (!Number.isNaN(parsedDate)) {
    return Math.min(maxDelayMs, Math.max(0, parsedDate - Date.now()));
  }
  return null;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createAbortError(reason?: unknown): Error {
  if (reason instanceof Error) return reason;
  const err = new Error(typeof reason === 'string' ? reason : 'The operation was aborted');
  err.name = 'AbortError';
  return err;
}

export interface FetchResilienceOptions {
  breaker?: CircuitBreaker;
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  fetchFn?: typeof fetch;
  sleepFn?: (ms: number) => Promise<void>;
  randomFn?: () => number;
}

export async function fetchWithResilience(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: FetchResilienceOptions = {}
): Promise<Response> {
  const breaker = options.breaker ?? defaultGoApiBreaker;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxRetries = options.maxRetries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 200;
  const maxDelayMs = options.maxDelayMs ?? 2_000;
  const fetchFn = options.fetchFn ?? fetch;
  const sleepFn = options.sleepFn ?? defaultSleep;
  const randomFn = options.randomFn ?? Math.random;

  if (init.signal?.aborted) {
    throw createAbortError((init.signal as { reason?: unknown }).reason);
  }

  const headers = headersToRecord(init.headers);
  if (!findHeader(headers, 'X-Correlation-ID')) {
    headers['X-Correlation-ID'] = generateCorrelationId();
  }

  const canRetry = isRetryableMethod(init.method, headers);
  const allowedRetries = canRetry ? maxRetries : 0;

  for (let attempt = 0; attempt <= allowedRetries; attempt += 1) {
    breaker.allow();

    const controller = new AbortController();
    let timedOut = false;
    const onCallerAbort = () => controller.abort();
    if (init.signal) {
      init.signal.addEventListener('abort', onCallerAbort, { once: true });
    }

    const timeoutId =
      timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, timeoutMs)
        : null;

    let response: Response;
    try {
      response = await fetchFn(input, {
        ...init,
        headers,
        signal: controller.signal,
      });
    } catch (err) {
      if (timeoutId !== null) clearTimeout(timeoutId);
      if (init.signal) init.signal.removeEventListener('abort', onCallerAbort);

      const callerAborted = Boolean(init.signal?.aborted) && !timedOut;
      if (callerAborted) {
        throw err;
      }

      breaker.recordFailure();
      if (attempt < allowedRetries && breaker.canAttemptNow()) {
        const exp = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
        const delayMs = Math.round(exp * (0.5 + randomFn() * 0.5));
        await sleepFn(delayMs);
        if (init.signal?.aborted) {
          throw createAbortError((init.signal as { reason?: unknown }).reason);
        }
        continue;
      }
      throw err;
    }

    if (timeoutId !== null) clearTimeout(timeoutId);
    if (init.signal) init.signal.removeEventListener('abort', onCallerAbort);

    if (isTransientStatus(response.status)) {
      breaker.recordFailure();
      if (attempt < allowedRetries && breaker.canAttemptNow()) {
        const retryAfter = parseRetryAfterMs(response.headers?.get?.('Retry-After'), maxDelayMs);
        const exp = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
        const delayMs = retryAfter ?? Math.round(exp * (0.5 + randomFn() * 0.5));
        await sleepFn(delayMs);
        if (init.signal?.aborted) {
          throw createAbortError((init.signal as { reason?: unknown }).reason);
        }
        continue;
      }
      return response;
    }

    breaker.recordSuccess();
    return response;
  }

  throw new CircuitBreakerOpenError(breaker.name);
}
