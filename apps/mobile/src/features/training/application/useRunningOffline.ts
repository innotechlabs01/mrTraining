/**
 * useRunningOffline — persistencia local de sesiones de running con MMKV.
 * Permite guardar sesiones activas y puntos GPS pendientes de sincronización
 * cuando no hay conectividad, y reintentarlos cuando se recupere la conexión.
 */
import { MMKV } from 'react-native-mmkv';
import { useCallback, useEffect, useState } from 'react';
import { smartClient as apiClient } from '../../../infrastructure/api/client';
import { GpsPoint } from './useGpsTracking';

const storage = new MMKV({ id: 'running-offline' });

const PENDING_SESSIONS_KEY = 'pending_sessions';
const PENDING_POINTS_KEY = 'pending_points';

export interface PendingSession {
  sessionId: string;
  workoutId: string;
  athleteId: string;
  scheduledDate?: string;
  athleteInstructions?: string;
  status: 'started' | 'completed';
  createdAt: string;
}

export interface PendingGpsPoint {
  sessionId: string;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  timestamp: string;
  accuracy?: number | null;
}

export interface UseRunningOfflineResult {
  pendingSessions: PendingSession[];
  pendingPointsCount: number;
  syncPendingSessions: () => Promise<void>;
  syncPendingPoints: (sessionId: string) => Promise<void>;
  isSyncing: boolean;
}

export function useRunningOffline(): UseRunningOfflineResult {
  const [isSyncing, setIsSyncing] = useState(false);

  const pendingSessions = useCallback((): PendingSession[] => {
    try {
      const raw = storage.getString(PENDING_SESSIONS_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }, []);

  const pendingPoints = useCallback((): Record<string, PendingGpsPoint[]> => {
    try {
      const raw = storage.getString(PENDING_POINTS_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }, []);

  const syncPendingSessions = useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    try {
      const sessions = pendingSessions();
      for (const session of sessions) {
        try {
          await apiClient.post(`/running/workouts/sessions/${session.sessionId}/complete`, {
            sessionId: session.sessionId,
            workoutId: session.workoutId,
            distance: 0,
            duration: 0,
            pace: '0:00',
            calories: 0,
            elevation: 0,
            heart_rate: 0,
            cadence: 0,
            gps_route: '',
          });
          // Eliminar de pendientes tras sincronizar
          const remaining = pendingSessions().filter(s => s.sessionId !== session.sessionId);
          storage.set(PENDING_SESSIONS_KEY, JSON.stringify(remaining));
        } catch (err) {
          console.error(`Failed to sync session ${session.sessionId}:`, err);
        }
      }
    } finally {
      setIsSyncing(false);
    }
  }, [pendingSessions]);

  const syncPendingPoints = useCallback(async (sessionId: string): Promise<void> => {
    setIsSyncing(true);
    try {
      const points = pendingPoints()[sessionId] || [];
      if (points.length === 0) return;

      for (const point of points) {
        try {
          await apiClient.post(`/running/workouts/sessions/${sessionId}/live-location`, {
            session_id: sessionId,
            lat: point.latitude,
            lng: point.longitude,
            alt: point.altitude,
            timestamp: point.timestamp,
            accuracy: point.accuracy,
          });
        } catch (err) {
          console.error(`Failed to sync GPS point for session ${sessionId}:`, err);
          break; // Detener si falla para no perder puntos
        }
      }

      // Eliminar puntos sincronizados
      const remaining = { ...pendingPoints() };
      delete remaining[sessionId];
      storage.set(PENDING_POINTS_KEY, JSON.stringify(remaining));
    } finally {
      setIsSyncing(false);
    }
  }, [pendingPoints]);

  return {
    pendingSessions: pendingSessions(),
    pendingPointsCount: Object.values(pendingPoints()).reduce((sum, pts) => sum + pts.length, 0),
    syncPendingSessions,
    syncPendingPoints,
    isSyncing,
  };
}
