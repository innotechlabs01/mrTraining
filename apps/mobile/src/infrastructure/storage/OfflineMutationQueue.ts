/**
 * OfflineMutationQueue — Durable MMKV-backed outbox queue for mobile writes.
 *
 * - Preserves client-generated Idempotency-Key & X-Correlation-ID across retries and app restarts.
 * - Deduplicates repeated enqueues by Idempotency-Key.
 * - Caps pending queue depth (default 200) and moves permanent 4xx / exhausted items to a dead-letter list.
 * - Uses single-flight flush lock + exponential backoff with jitter + 401 pause-until-reauth.
 */
import {
  mmkv,
  userScopedKey,
  type KeyValueStorage,
} from './mmkv';
import {
  computeBackoffMs,
  createCorrelationId,
  createIdempotencyKey,
  extractAxiosStatus,
  isCircuitBreakerOpenError,
} from '../api/resilience';

export type OfflineMutationMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface QueuedMutation {
  id: string;
  method: OfflineMutationMethod;
  url: string;
  data?: unknown;
  idempotencyKey: string;
  correlationId: string;
  createdAt: number;
  attempts: number;
  nextRetryAt: number;
  lastError?: string;
}

export interface DeadLetterMutation extends QueuedMutation {
  failedAt: number;
  reason: 'permanent_4xx' | 'max_attempts' | 'overflow';
}

export interface EnqueueMutationInput {
  id?: string;
  method: OfflineMutationMethod;
  url: string;
  data?: unknown;
  idempotencyKey?: string;
  correlationId?: string;
}

export interface FlushResult {
  processed: number;
  succeeded: number;
  retriedLater: number;
  deadLettered: number;
  remaining: number;
  pausedForAuth: boolean;
  circuitBreakerOpen: boolean;
}

export type MutationExecutor = (mutation: QueuedMutation) => Promise<unknown>;

export interface OfflineMutationQueueOptions {
  storage?: KeyValueStorage;
  storageKey?: string;
  deadLetterKey?: string;
  userScoped?: boolean;
  maxQueueSize?: number;
  maxAttempts?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  now?: () => number;
  random?: () => number;
  onDeadLetter?: (entry: DeadLetterMutation) => void;
}

export class OfflineMutationQueue {
  private readonly storage: KeyValueStorage;
  private readonly storageKeyBase: string;
  private readonly deadLetterKeyBase: string;
  private readonly userScoped: boolean;
  private readonly maxQueueSize: number;
  private readonly maxAttempts: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly onDeadLetter: ((entry: DeadLetterMutation) => void) | undefined;

  private inFlightFlush: Promise<FlushResult> | null = null;

  constructor(options: OfflineMutationQueueOptions = {}) {
    this.storage = options.storage ?? mmkv;
    this.storageKeyBase = options.storageKey ?? 'offline_mutation_queue';
    this.deadLetterKeyBase = options.deadLetterKey ?? 'offline_mutation_dlq';
    this.userScoped = options.userScoped ?? true;
    this.maxQueueSize = options.maxQueueSize ?? 200;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.baseBackoffMs = options.baseBackoffMs ?? 1_000;
    this.maxBackoffMs = options.maxBackoffMs ?? 60_000;
    this.now = options.now ?? (() => Date.now());
    this.random = options.random ?? Math.random;
    this.onDeadLetter = options.onDeadLetter;
  }

  private resolveKey(base: string): string {
    return this.userScoped ? userScopedKey(base) : base;
  }

  private readList<T>(base: string): T[] {
    const raw = this.storage.getString(this.resolveKey(base));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      this.storage.remove(this.resolveKey(base));
      return [];
    }
  }

  private writeList<T>(base: string, items: T[]): void {
    this.storage.set(this.resolveKey(base), JSON.stringify(items));
  }

  getAll(): QueuedMutation[] {
    return this.readList<QueuedMutation>(this.storageKeyBase);
  }

  getDeadLetters(): DeadLetterMutation[] {
    return this.readList<DeadLetterMutation>(this.deadLetterKeyBase);
  }

  clear(): void {
    this.storage.remove(this.resolveKey(this.storageKeyBase));
  }

  clearDeadLetters(): void {
    this.storage.remove(this.resolveKey(this.deadLetterKeyBase));
  }

  private pushDeadLetter(item: QueuedMutation, reason: DeadLetterMutation['reason']): void {
    const entry: DeadLetterMutation = {
      ...item,
      failedAt: this.now(),
      reason,
    };
    const dlq = this.getDeadLetters();
    dlq.push(entry);
    // Keep DLQ bounded too
    if (dlq.length > this.maxQueueSize) {
      dlq.splice(0, dlq.length - this.maxQueueSize);
    }
    this.writeList(this.deadLetterKeyBase, dlq);
    this.onDeadLetter?.(entry);
  }

  enqueue(input: EnqueueMutationInput): QueuedMutation {
    const queue = this.getAll();
    const idempotencyKey = input.idempotencyKey?.trim() || createIdempotencyKey();

    const existing = queue.find((item) => item.idempotencyKey === idempotencyKey);
    if (existing) {
      return existing;
    }

    const nowMs = this.now();
    const entry: QueuedMutation = {
      id: input.id ?? idempotencyKey,
      method: input.method,
      url: input.url,
      data: input.data,
      idempotencyKey,
      correlationId: input.correlationId?.trim() || createCorrelationId(),
      createdAt: nowMs,
      attempts: 0,
      nextRetryAt: nowMs,
    };

    while (queue.length >= this.maxQueueSize) {
      const evicted = queue.shift();
      if (evicted) {
        this.pushDeadLetter(evicted, 'overflow');
      }
    }

    queue.push(entry);
    this.writeList(this.storageKeyBase, queue);
    return entry;
  }

  async flush(executor?: MutationExecutor): Promise<FlushResult> {
    if (this.inFlightFlush) {
      return this.inFlightFlush;
    }

    const runExecutor: MutationExecutor =
      executor ??
      (async (mutation) => {
        const { smartClient } = require('../api/client') as typeof import('../api/client');
        return smartClient.request({
          method: mutation.method,
          url: mutation.url,
          data: mutation.data,
          headers: {
            'Idempotency-Key': mutation.idempotencyKey,
            'X-Correlation-ID': mutation.correlationId,
          },
        });
      });

    this.inFlightFlush = this.performFlush(runExecutor).finally(() => {
      this.inFlightFlush = null;
    });
    return this.inFlightFlush;
  }

  private async performFlush(executor: MutationExecutor): Promise<FlushResult> {
    const result: FlushResult = {
      processed: 0,
      succeeded: 0,
      retriedLater: 0,
      deadLettered: 0,
      remaining: 0,
      pausedForAuth: false,
      circuitBreakerOpen: false,
    };

    const queue = this.getAll();
    const snapshotIds = queue.map((item) => item.id);

    for (const id of snapshotIds) {
      const current = this.getAll();
      const idx = current.findIndex((item) => item.id === id);
      if (idx === -1) continue;

      const item = current[idx];
      if (item.nextRetryAt > this.now()) {
        continue;
      }

      result.processed += 1;
      try {
        await executor(item);
        const latest = this.getAll().filter((m) => m.id !== item.id);
        this.writeList(this.storageKeyBase, latest);
        result.succeeded += 1;
      } catch (err) {
        if (isCircuitBreakerOpenError(err)) {
          result.circuitBreakerOpen = true;
          break;
        }

        const status = extractAxiosStatus(err);
        if (status === 401) {
          result.pausedForAuth = true;
          break;
        }

        const message =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : 'Mutation failed';

        const isPermanent4xx =
          typeof status === 'number' &&
          status >= 400 &&
          status < 500 &&
          status !== 408 &&
          status !== 429;

        const latest = this.getAll();
        const latestIdx = latest.findIndex((m) => m.id === item.id);
        if (latestIdx === -1) continue;

        if (isPermanent4xx) {
          const [removed] = latest.splice(latestIdx, 1);
          this.writeList(this.storageKeyBase, latest);
          this.pushDeadLetter({ ...removed, lastError: message }, 'permanent_4xx');
          result.deadLettered += 1;
          continue;
        }

        const nextAttempts = latest[latestIdx].attempts + 1;
        if (nextAttempts >= this.maxAttempts) {
          const [removed] = latest.splice(latestIdx, 1);
          this.writeList(this.storageKeyBase, latest);
          this.pushDeadLetter(
            { ...removed, attempts: nextAttempts, lastError: message },
            'max_attempts'
          );
          result.deadLettered += 1;
          continue;
        }

        latest[latestIdx] = {
          ...latest[latestIdx],
          attempts: nextAttempts,
          lastError: message,
          nextRetryAt:
            this.now() +
            computeBackoffMs(nextAttempts - 1, this.baseBackoffMs, this.maxBackoffMs, this.random),
        };
        this.writeList(this.storageKeyBase, latest);
        result.retriedLater += 1;
      }
    }

    result.remaining = this.getAll().length;
    return result;
  }
}

export const defaultOfflineMutationQueue = new OfflineMutationQueue();
