/**
 * useRunningOffline — cola offline de acciones de running con MMKV y reintento
 * idempotente.
 *
 * Cuando el dispositivo está sin conexión, las acciones (iniciar sesión,
 * completar sesión, lote GPS) se encolan localmente con una clave de
 * idempotencia y se reenvían al recuperar la conexión. Las acciones ya
 * procesadas no se duplican gracias a la clave de idempotencia.
 *
 * Storage: MMKV, cola única de acciones (`running:offline-queue:v1`).
 *
 * Flush policy:
 * - 4xx → el payload es inválido: se descarta el ítem y se avisa una sola vez.
 * - 5xx / error de transporte → se detiene el flush y se deja el resto de la
 *   cola para el siguiente disparo (reconexión o montaje de pantalla).
 * - Éxito → se elimina el ítem y se purga la cola tras un flush completo.
 *
 * TTL: los ítems más viejos de `OFFLINE_TTL_MS` se descartan al flush para
 * evitar crecimiento ilimitado de la cola.
 */
import { useCallback, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {
  generateIdempotencyKey,
  smartClient as apiClient,
} from '../../../infrastructure/api/client';
import {
  mmkvGetJsonUserScoped,
  mmkvSetJson,
  userScopedKey,
} from '../../../infrastructure/storage/mmkv';
import { texts } from '../../../shared/i18n/texts';

const OFFLINE_QUEUE_KEY = 'mr_training.runningOffline.v1';
const OFFLINE_TTL_MS = 1000 * 60 * 60 * 24; // 24 h

export type RunningActionType = 'start_session' | 'complete_session' | 'gps_batch';

export interface RunningOfflineAction {
  id: string;
  idempotencyKey: string;
  type: RunningActionType;
  path: string;
  payload: unknown;
  createdAt: string;
}

export interface UseRunningOfflineResult {
  pendingCount: number;
  isSyncing: boolean;
  enqueueAction: (action: Omit<RunningOfflineAction, 'id' | 'idempotencyKey' | 'createdAt'>) => void;
  syncQueue: () => Promise<void>;
}

/** Lectura de la cola (user-scoped, `:anon` pre-auth). */
function readQueue(): RunningOfflineAction[] {
  try {
    return mmkvGetJsonUserScoped<RunningOfflineAction[]>(OFFLINE_QUEUE_KEY) ?? [];
  } catch (err) {
    console.error('[runningOffline] read failed:', err);
    return [];
  }
}

function writeQueue(items: RunningOfflineAction[]): void {
  try {
    mmkvSetJson(userScopedKey(OFFLINE_QUEUE_KEY), items);
  } catch (err) {
    console.error('[runningOffline] write failed:', err);
  }
}

/** Descarta ítems expirados por TTL. */
function purgeExpired(items: RunningOfflineAction[]): RunningOfflineAction[] {
  const now = Date.now();
  return items.filter((item) => {
    const age = now - Date.parse(item.createdAt);
    return Number.isFinite(age) && age < OFFLINE_TTL_MS;
  });
}

let localId = 0;

/** Encola una acción para reenvío cuando haya conexión. */
export function enqueueRunningAction(
  action: Omit<RunningOfflineAction, 'id' | 'idempotencyKey' | 'createdAt'>
): string {
  const queue = readQueue();
  const item: RunningOfflineAction = {
    id: `${Date.now()}-${localId++}`,
    idempotencyKey: generateIdempotencyKey(),
    createdAt: new Date().toISOString(),
    ...action,
  };
  queue.push(item);
  writeQueue(queue);
  return item.idempotencyKey;
}

export function getRunningQueueCount(): number {
  return readQueue().length;
}

/** Extrae el código HTTP de un error estilo axios, si lo tiene. */
function httpStatusOf(err: unknown): number | null {
  const status = (err as { response?: { status?: unknown } } | null | undefined)?.response?.status;
  return typeof status === 'number' ? status : null;
}

let flushing = false; // re-entrancy guard

/**
 * Reenvía todos los ítems en cola en orden. Devuelve la cantidad que queda.
 * 4xx descarta el ítem; 5xx/transporte detiene el flush y deja el resto.
 */
export async function flushRunningQueue(): Promise<number> {
  if (flushing) return getRunningQueueCount();
  flushing = true;
  let alertedInvalid = false;
  try {
    for (;;) {
      let queue = purgeExpired(readQueue());
      const head = queue[0];
      if (!head) break;

      let outcome: 'sent' | 'invalid' | 'retryLater' = 'sent';
      try {
        await apiClient.post(head.path, head.payload, {
          headers: { 'Idempotency-Key': head.idempotencyKey },
        });
      } catch (err) {
        const status = httpStatusOf(err);
        if (status != null && status >= 400 && status < 500) {
          console.warn(
            `[runningOffline] dropping item ${head.id}: ${status} on ${head.path}`
          );
          outcome = 'invalid';
        } else {
          outcome = 'retryLater';
        }
      }

      if (outcome === 'retryLater') break;

      queue.shift();
      writeQueue(queue);

      if (outcome === 'invalid' && !alertedInvalid) {
        alertedInvalid = true;
        Alert.alert(
          texts.screens.workoutExecution.outboxDropTitle,
          texts.screens.workoutExecution.outboxDropBody,
        );
      }
    }
    // Purga expirados tras cada flush exitoso.
    writeQueue(purgeExpired(readQueue()));
  } finally {
    flushing = false;
  }
  return getRunningQueueCount();
}

// ---------------------------------------------------------------------------
// Change notification (pending-sync badge)
// ---------------------------------------------------------------------------

type OfflineListener = (count: number) => void;
const listeners = new Set<OfflineListener>();

export function subscribeRunningOffline(listener: OfflineListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(): void {
  const count = getRunningQueueCount();
  for (const listener of listeners) listener(count);
}

// ---------------------------------------------------------------------------
// Hook: UI-facing wrapper con auto-flush al recuperar la conexión
// ---------------------------------------------------------------------------

export function useRunningOffline(): UseRunningOfflineResult {
  const [isSyncing, setIsSyncing] = useState(false);

  const enqueueAction = useCallback(
    (action: Omit<RunningOfflineAction, 'id' | 'idempotencyKey' | 'createdAt'>) => {
      enqueueRunningAction(action);
      notifyListeners();
    },
    []
  );

  const syncQueue = useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    try {
      await flushRunningQueue();
    } finally {
      setIsSyncing(false);
      notifyListeners();
    }
  }, []);

  // Auto-flush al recuperar la conexión.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected === true) {
        void syncQueue();
      }
    });
    // También intentar flush al montar (cubre cola dejada por sesión previa).
    void syncQueue();
    return () => unsubscribe();
  }, [syncQueue]);

  return { pendingCount: getRunningQueueCount(), isSyncing, enqueueAction, syncQueue };
}

