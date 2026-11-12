/**
 * useRunningSync — sincronización de estado de sesión de running con el backend.
 *
 * Orquestra iniciar y completar una sesión de running estructurada:
 * - Cuando hay conexión, llama al backend directamente (start / complete).
 * - Sin conexión (o fallo de transporte), encola la acción en MMKV con clave
 *   de idempotencia para reenviarla al recuperar la conexión (sin duplicados).
 * - Reproduce audio cues en las transiciones iniciado → ejecutando → completado.
 * - Expone el estado de sincronización para la UI (idle → started/running → completed → error).
 */
import { useCallback, useState, useEffect } from 'react';
import { smartClient as apiClient, generateIdempotencyKey } from '../../../infrastructure/api/client';
import { enqueueRunningAction, useRunningOffline } from './useRunningOffline';
import { useRunningAudio } from './useRunningAudio';
import type { CompleteRunningSessionRequest } from './useRunningWorkouts';

export type RunningSyncStatus = 'idle' | 'started' | 'running' | 'completed' | 'error';

export interface UseRunningSyncResult {
  status: RunningSyncStatus;
  isSyncing: boolean;
  sessionId: string | null;
  pendingCount: number;
  startSession: (assignmentId: string) => Promise<string | null>;
  completeSession: (sessionId: string, req: CompleteRunningSessionRequest) => Promise<boolean>;
  retrySync: () => Promise<void>;
}

const AUDIO_STARTED = 'Sesión iniciada. ¡A correr!';
const AUDIO_COMPLETED = 'Sesión completada. ¡Buen trabajo!';
const AUDIO_ERROR = 'Error al sincronizar la sesión.';

/** Cuánto tiempo esperar entre reintentos automáticos (ms). */
const RETRY_INTERVAL_MS = 10000;

/** Extrae el código HTTP de un error estilo axios, si lo tiene. */
function httpStatusOf(err: unknown): number | null {
  const status = (err as { response?: { status?: unknown } } | null | undefined)?.response?.status;
  return typeof status === 'number' ? status : null;
}

/** Un fallo de transporte o 5xx merece reintento; un 4xx no. */
function isRetryable(err: unknown): boolean {
  const status = httpStatusOf(err);
  return status == null || status >= 500;
}

function isOnline(): boolean {
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

export function useRunningSync(): UseRunningSyncResult {
  const [status, setStatus] = useState<RunningSyncStatus>('idle');
  const [isSyncing, setIsSyncing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { speak } = useRunningAudio();
  const { syncQueue, pendingCount } = useRunningOffline();

  const startSession = useCallback(async (assignmentId: string): Promise<string | null> => {
    if (!assignmentId) return null;
    setIsSyncing(true);
    setStatus('started');
    try {
      if (!isOnline()) {
        // Sin conexión: encolar inicio para reenviar al recuperar la conexión.
        enqueueRunningAction({
          type: 'start_session',
          path: '/running/workouts/sessions/start',
          payload: { assignment_id: assignmentId },
        });
        setStatus('running');
        void speak(AUDIO_STARTED);
        return null;
      }
      const response = await apiClient.post<{ session_id: string; status: string }>(
        '/running/workouts/sessions/start',
        { assignment_id: assignmentId },
        { headers: { 'Idempotency-Key': generateIdempotencyKey() } },
      );
      const data = response?.data;
      if (!data?.session_id) {
        setStatus('error');
        return null;
      }
      setSessionId(data.session_id);
      setStatus('running');
      void speak(AUDIO_STARTED);
      return data.session_id;
    } catch (err) {
      if (isRetryable(err)) {
        // Fallo de transporte: encolar para reenviar sin perder la sesión.
        enqueueRunningAction({
          type: 'start_session',
          path: '/running/workouts/sessions/start',
          payload: { assignment_id: assignmentId },
        });
        setStatus('running');
        void speak(AUDIO_STARTED);
        return null;
      }
      setStatus('error');
      console.error('[runningSync] start rejected:', err);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [speak, enqueueRunningAction]);

  const completeSession = useCallback(
    async (sessionIdParam: string, req: CompleteRunningSessionRequest): Promise<boolean> => {
      setIsSyncing(true);
      setStatus('completed');
      try {
        if (!isOnline()) {
          // Sin conexión: encolar completación para reenviar al recuperar la conexión.
          enqueueRunningAction({
            type: 'complete_session',
            path: `/running/workouts/sessions/${sessionIdParam}/complete`,
            payload: req,
          });
          setSessionId(sessionIdParam);
          setStatus('completed');
          void speak(AUDIO_COMPLETED);
          return true;
        }
        await apiClient.post<{ session_id: string; status: string }>(
          `/running/workouts/sessions/${sessionIdParam}/complete`,
          req,
          { headers: { 'Idempotency-Key': generateIdempotencyKey() } },
        );
        setSessionId(sessionIdParam);
        setStatus('completed');
        void speak(AUDIO_COMPLETED);
        return true;
      } catch (err) {
        if (isRetryable(err)) {
          enqueueRunningAction({
            type: 'complete_session',
            path: `/running/workouts/sessions/${sessionIdParam}/complete`,
            payload: req,
          });
          setSessionId(sessionIdParam);
          setStatus('completed');
          void speak(AUDIO_COMPLETED);
          return true;
        }
        setStatus('error');
        console.error('[runningSync] complete rejected:', err);
        void speak(AUDIO_ERROR);
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [speak, enqueueRunningAction]
  );

  const retrySync = useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    try {
      await syncQueue();
      setStatus(pendingCount > 0 ? 'started' : 'completed');
    } finally {
      setIsSyncing(false);
    }
  }, [syncQueue, pendingCount]);

  // Reintento periódico mientras haya cola pendiente (el flush ante
  // reconexión ya lo gestiona useRunningOffline vía NetInfo).
  useEffect(() => {
    const timer = setInterval(() => {
      if (pendingCount > 0) void syncQueue();
    }, RETRY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [syncQueue, pendingCount]);

  return { status, isSyncing, sessionId, pendingCount, startSession, completeSession, retrySync };
}
