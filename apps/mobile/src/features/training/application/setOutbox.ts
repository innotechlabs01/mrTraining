/**
 * Offline set outbox — durable queue for workout sets logged while offline.
 *
 * The athlete must never lose a logged set. When the mutating POST to the Go API
 * fails (network down or any non-2xx response), the multi-step flow for that tap
 * (POST set → POST progress → POST complete) is enqueued here as ONE compound
 * item holding the still-unsent steps, so replay preserves ordering.
 *
 * Storage: MMKV, user-scoped (`<base>:<userId>`, `:anon` pre-auth) so queues
 * never leak across accounts on a shared device.
 *
 * Flush policy (`flushSetOutbox`):
 * - Steps replay strictly in queue order.
 * - 4xx on a step → the payload is permanently invalid: the whole item is
 *   dropped and ONE alert is surfaced per flush pass (never silently dropped,
 *   never one alert per item).
 * - Transport errors and 5xx → stop flushing and leave the remainder of the
 *   queue untouched for the next trigger (NetInfo reconnect or screen mount).
 */
import { Alert } from 'react-native';
import {
  mmkvGetJsonUserScoped,
  mmkvSetJson,
  userScopedKey,
} from '../../../infrastructure/storage/mmkv';
import { texts } from '../../../shared/i18n/texts';

/** A single API call to replay, in order, as part of a logged set's flow. */
export type OutboxStep = {
  path: string;
  body: Record<string, unknown>;
};

export type SetOutboxItem = {
  id: string;
  steps: OutboxStep[];
};

const OUTBOX_KEY = 'mr_training.setOutbox.v1';

function readQueue(): SetOutboxItem[] {
  try {
    return mmkvGetJsonUserScoped<SetOutboxItem[]>(OUTBOX_KEY) ?? [];
  } catch (err) {
    console.error('[setOutbox] read failed:', err);
    return [];
  }
}

// Write to the canonical (current-user) key. Items enqueued pre-auth under the
// anon key are read back by mmkvGetJsonUserScoped, but rewrites land on the
// resolved key; the anon remainder is dropped on the next enqueue. A duplicate
// anon-copy write would only matter if auth identity flipped mid-outbox-flight,
// which the resume buffer handles the same way — keep both paths simple.
function writeQueue(items: SetOutboxItem[]): void {
  try {
    mmkvSetJson(userScopedKey(OUTBOX_KEY), items);
  } catch (err) {
    console.error('[setOutbox] write failed:', err);
  }
}

let localId = 0;

/** Enqueue the still-unsent steps of a failed set-logging flow. */
export function enqueueSetOutbox(steps: OutboxStep[]): void {
  if (steps.length === 0) return;
  const queue = readQueue();
  queue.push({ id: `${Date.now()}-${localId++}`, steps });
  writeQueue(queue);
  notifyListeners();
}

export function getSetOutboxCount(): number {
  return readQueue().length;
}

// ---------------------------------------------------------------------------
// Change notification (for the pending-sync badge)

type OutboxListener = (count: number) => void;
const listeners = new Set<OutboxListener>();

/** Subscribe to queue-size changes. Returns an unsubscribe function. */
export function subscribeSetOutbox(listener: OutboxListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(): void {
  const count = getSetOutboxCount();
  for (const listener of listeners) listener(count);
}

// ---------------------------------------------------------------------------
// Flush

export type SetOutboxPost = (path: string, body: Record<string, unknown>) => Promise<unknown>;

/** Extract an HTTP status from an axios-style error, if present. */
function httpStatusOf(err: unknown): number | null {
  const status = (err as { response?: { status?: unknown } } | null | undefined)?.response?.status;
  return typeof status === 'number' ? status : null;
}

let flushing = false; // re-entrancy guard: concurrent flushes would replay twice

/**
 * Replay queued flows in order via `post` (typically `apiClient.post`).
 * Returns the number of items left in the queue.
 */
export async function flushSetOutbox(post: SetOutboxPost): Promise<number> {
  if (flushing) return getSetOutboxCount();
  flushing = true;
  let alertedInvalid = false;
  try {
    for (;;) {
      const queue = readQueue();
      const head = queue[0];
      if (!head) break;

      let outcome: 'sent' | 'invalid' | 'retryLater' = 'sent';
      for (const step of head.steps) {
        try {
          await post(step.path, step.body);
        } catch (err) {
          const status = httpStatusOf(err);
          if (status != null && status >= 400 && status < 500) {
            // Server rejected the payload — retrying would 4xx forever.
            console.warn(
              `[setOutbox] dropping item ${head.id}: ${status} on ${step.path}`,
            );
            outcome = 'invalid';
          } else {
            outcome = 'retryLater';
          }
          break;
        }
      }

      if (outcome === 'retryLater') break;

      // 'sent' and 'invalid' both remove the head item.
      queue.shift();
      writeQueue(queue);
      notifyListeners();

      if (outcome === 'invalid' && !alertedInvalid) {
        alertedInvalid = true;
        Alert.alert(
          texts.screens.workoutExecution.outboxDropTitle,
          texts.screens.workoutExecution.outboxDropBody,
        );
      }
    }
  } finally {
    flushing = false;
  }
  return getSetOutboxCount();
}
