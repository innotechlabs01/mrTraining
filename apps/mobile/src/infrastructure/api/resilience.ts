/**
 * Mobile HTTP transport resilience primitives:
 * - CircuitBreaker (CLOSED / OPEN / HALF_OPEN)
 * - Correlation & Idempotency-Key generation
 * - Transient error classification for Axios
 * - Exponential backoff with full jitter
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
  readonly isCircuitBreakerOpen = true;
  readonly breakerName: string;

  constructor(breakerName = 'mobile_go_api') {
    super(`Circuit breaker "${breakerName}" is OPEN; Go API temporarily unavailable`);
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
  private readonly onStateChange: ((from: CircuitState, to: CircuitState) => void) | undefined;
  private readonly now: () => number;

  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private openedAt = 0;
  private halfOpenInFlight = 0;
  private halfOpenSuccesses = 0;

  constructor(options: CircuitBreakerOptions = {}) {
    this.name = options.name ?? 'mobile_go_api';
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
      return this.now() - this.openedAt >= this.resetTimeoutMs;
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

export const defaultMobileApiBreaker = new CircuitBreaker({
  name: 'mobile_go_api',
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxCalls: 2,
});

export function resetDefaultMobileApiBreaker(): void {
  defaultMobileApiBreaker.reset();
}

function generateId(prefix: string): string {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createCorrelationId(): string {
  return generateId('corr');
}

export function createIdempotencyKey(): string {
  return generateId('idem');
}

export function getHeaderCaseInsensitive(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== 'object') return undefined;

  const maybeAxiosHeaders = headers as { get?: (key: string) => unknown };
  if (typeof maybeAxiosHeaders.get === 'function') {
    const val = maybeAxiosHeaders.get(name);
    if (typeof val === 'string' && val.trim() !== '') return val;
  }

  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
    if (k.toLowerCase() === lower && typeof v === 'string' && v.trim() !== '') {
      return v;
    }
  }
  return undefined;
}

export function setHeaderIfMissing(headers: unknown, name: string, value: string): void {
  if (!headers || typeof headers !== 'object') return;
  if (getHeaderCaseInsensitive(headers, name)) return;

  const maybeAxiosHeaders = headers as { set?: (key: string, val: string) => void };
  if (typeof maybeAxiosHeaders.set === 'function') {
    maybeAxiosHeaders.set(name, value);
    return;
  }
  (headers as Record<string, string>)[name] = value;
}

export function extractAxiosStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const errObj = error as { status?: unknown; response?: { status?: unknown } };
  if (typeof errObj.response?.status === 'number') return errObj.response.status;
  if (typeof errObj.status === 'number') return errObj.status;
  return undefined;
}

export function isCircuitBreakerOpenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return Boolean((error as { isCircuitBreakerOpen?: unknown }).isCircuitBreakerOpen);
}

export function isTransientAxiosError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if (isCircuitBreakerOpenError(error)) return false;

  const errObj = error as {
    code?: unknown;
    response?: { status?: unknown };
  };
  if (errObj.code === 'ERR_CANCELED') return false;

  const status = errObj.response?.status;
  if (typeof status === 'number') {
    return status === 408 || status === 429 || (status >= 500 && status <= 599);
  }

  // No HTTP response => network failure, offline, DNS, or timeout
  return true;
}

export function isRetryableAxiosConfig(config?: {
  method?: string;
  headers?: unknown;
}): boolean {
  const method = (config?.method ?? 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }
  const key = getHeaderCaseInsensitive(config?.headers, 'Idempotency-Key');
  return typeof key === 'string' && key.trim().length > 0;
}

export function computeBackoffMs(
  attempt: number,
  baseMs = 250,
  maxMs = 2_000,
  randomFn: () => number = Math.random
): number {
  const safeAttempt = Math.max(0, attempt);
  const exp = Math.min(maxMs, baseMs * Math.pow(2, safeAttempt));
  return Math.round(exp * (0.5 + randomFn() * 0.5));
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
