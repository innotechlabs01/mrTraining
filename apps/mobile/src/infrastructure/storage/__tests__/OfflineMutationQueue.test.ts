import { OfflineMutationQueue } from '../OfflineMutationQueue';
import { CircuitBreakerOpenError } from '../../api/resilience';
import type { KeyValueStorage } from '../mmkv';

function createMemoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getString: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, String(value));
    },
    remove: (key) => map.delete(key),
    getAllKeys: () => Array.from(map.keys()),
    clearAll: () => {
      map.clear();
    },
  };
}

describe('OfflineMutationQueue', () => {
  it('deduplicates enqueued writes by idempotencyKey and persists across instances', () => {
    const storage = createMemoryStorage();
    const queueA = new OfflineMutationQueue({ storage, userScoped: false });

    const first = queueA.enqueue({
      method: 'POST',
      url: '/workouts/w1/sets',
      data: { reps: 8 },
      idempotencyKey: 'set-w1-1',
      correlationId: 'corr-1',
    });
    const duplicate = queueA.enqueue({
      method: 'POST',
      url: '/workouts/w1/sets',
      data: { reps: 8 },
      idempotencyKey: 'set-w1-1',
      correlationId: 'corr-2',
    });

    expect(duplicate.id).toBe(first.id);
    expect(duplicate.correlationId).toBe('corr-1');

    const queueB = new OfflineMutationQueue({ storage, userScoped: false });
    expect(queueB.getAll()).toHaveLength(1);
    expect(queueB.getAll()[0].idempotencyKey).toBe('set-w1-1');
  });

  it('flushes FIFO, removes succeeded items, and moves permanent 4xx to dead letters', async () => {
    const storage = createMemoryStorage();
    const deadLetters: string[] = [];
    const queue = new OfflineMutationQueue({
      storage,
      userScoped: false,
      onDeadLetter: (entry) => deadLetters.push(`${entry.reason}:${entry.url}`),
    });

    queue.enqueue({ method: 'POST', url: '/ok', data: { a: 1 }, idempotencyKey: 'k1' });
    queue.enqueue({ method: 'POST', url: '/bad', data: { a: 2 }, idempotencyKey: 'k2' });

    const executor = jest
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce({ response: { status: 422 }, message: 'Unprocessable' });

    const result = await queue.flush(executor);

    expect(result.processed).toBe(2);
    expect(result.succeeded).toBe(1);
    expect(result.deadLettered).toBe(1);
    expect(result.remaining).toBe(0);
    expect(queue.getAll()).toHaveLength(0);
    expect(queue.getDeadLetters()).toHaveLength(1);
    expect(deadLetters).toEqual(['permanent_4xx:/bad']);
  });

  it('pauses on 401 and CircuitBreakerOpenError without burning attempts', async () => {
    const storage = createMemoryStorage();
    const queue = new OfflineMutationQueue({ storage, userScoped: false });
    queue.enqueue({ method: 'POST', url: '/a', idempotencyKey: 'k1' });
    queue.enqueue({ method: 'POST', url: '/b', idempotencyKey: 'k2' });

    const authResult = await queue.flush(
      jest.fn().mockRejectedValue({ response: { status: 401 }, message: 'Unauthorized' })
    );
    expect(authResult.pausedForAuth).toBe(true);
    expect(authResult.remaining).toBe(2);
    expect(queue.getAll()[0].attempts).toBe(0);

    const cbResult = await queue.flush(
      jest.fn().mockRejectedValue(new CircuitBreakerOpenError('mobile_go_api'))
    );
    expect(cbResult.circuitBreakerOpen).toBe(true);
    expect(cbResult.remaining).toBe(2);
    expect(queue.getAll()[0].attempts).toBe(0);
  });

  it('applies exponential backoff on transient failures and moves to DLQ after maxAttempts', async () => {
    let nowMs = 10_000;
    const storage = createMemoryStorage();
    const queue = new OfflineMutationQueue({
      storage,
      userScoped: false,
      maxAttempts: 3,
      baseBackoffMs: 500,
      maxBackoffMs: 5_000,
      now: () => nowMs,
      random: () => 1,
    });

    queue.enqueue({ method: 'POST', url: '/retry-me', idempotencyKey: 'k-retry' });
    const failingExecutor = jest
      .fn()
      .mockRejectedValue({ response: { status: 503 }, message: 'Service Unavailable' });

    const r1 = await queue.flush(failingExecutor);
    expect(r1.retriedLater).toBe(1);
    expect(queue.getAll()[0].attempts).toBe(1);

    // Too early: item should be skipped while nextRetryAt > nowMs
    const rEarly = await queue.flush(failingExecutor);
    expect(rEarly.processed).toBe(0);

    nowMs += 500;
    const r2 = await queue.flush(failingExecutor);
    expect(r2.retriedLater).toBe(1);
    expect(queue.getAll()[0].attempts).toBe(2);

    nowMs += 1_000;
    const r3 = await queue.flush(failingExecutor);
    expect(r3.deadLettered).toBe(1);
    expect(r3.remaining).toBe(0);
    expect(queue.getDeadLetters()[0].reason).toBe('max_attempts');
  });

  it('caps queue length and coalesces concurrent flush calls', async () => {
    const storage = createMemoryStorage();
    const queue = new OfflineMutationQueue({ storage, userScoped: false, maxQueueSize: 2 });
    queue.enqueue({ method: 'POST', url: '/1', idempotencyKey: 'k1' });
    queue.enqueue({ method: 'POST', url: '/2', idempotencyKey: 'k2' });
    queue.enqueue({ method: 'POST', url: '/3', idempotencyKey: 'k3' });

    expect(queue.getAll().map((m) => m.idempotencyKey)).toEqual(['k2', 'k3']);
    expect(queue.getDeadLetters()).toHaveLength(1);
    expect(queue.getDeadLetters()[0].reason).toBe('overflow');

    const executor = jest.fn(async () => {
      await new Promise((r) => setTimeout(r, 15));
      return { ok: true };
    });

    const [f1, f2] = await Promise.all([queue.flush(executor), queue.flush(executor)]);
    expect(executor).toHaveBeenCalledTimes(2);
    expect(f1).toEqual(f2);
    expect(f1.succeeded).toBe(2);
  });
});
