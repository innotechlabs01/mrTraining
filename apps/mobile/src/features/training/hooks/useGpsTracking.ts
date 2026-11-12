import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { apiClient, MAX_GPS_BATCH_POINTS, GPS_ACCURACY_FILTER_METERS } from '../../../infrastructure/api/client';

export interface GpsPoint {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  timestamp: string;
}

interface UseGpsTrackingOptions {
  /** Server running-session ID, not the workout template ID. */
  workoutId: string;
  exerciseId: string;
  enabled: boolean;
  onPoint?: (point: GpsPoint) => void;
  upload?: boolean;
}

/** Own one subscription per enabled session; never depend on isTracking. */
export function useGpsTracking({
  workoutId, exerciseId, enabled, onPoint, upload = true,
}: UseGpsTrackingOptions) {
  const [isTracking, setIsTracking] = useState(false);
  const [points, setPoints] = useState<GpsPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const watcher = useRef<Location.LocationSubscription | null>(null);
  const generation = useRef(0);
  const starting = useRef(false);
  const onPointRef = useRef(onPoint);
  onPointRef.current = onPoint;
  const buffer = useRef<GpsPoint[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushBatch = useCallback(async () => {
    const batch = buffer.current.splice(0, buffer.current.length);
    if (batch.length === 0) return;
    try {
      await apiClient.post(`/running/sessions/${workoutId}/live-location`, {
        session_id: workoutId,
        points: batch.map((p) => ({
          session_id: workoutId,
          lat: p.latitude,
          lng: p.longitude,
          alt: p.altitude,
          timestamp: p.timestamp,
          accuracy: p.accuracy,
        })),
      });
    } catch {
      // Best-effort batch send. Points are dropped from the buffer so the queue
      // cannot grow unbounded; a retryable failure is surfaced as an error banner.
      void setError('No se pudo sincronizar la ubicación.');
    }
  }, [workoutId]);

  const stopTracking = useCallback(() => {
    generation.current += 1;
    starting.current = false;
    if (flushTimer.current) {
      clearInterval(flushTimer.current);
      flushTimer.current = null;
    }
    watcher.current?.remove();
    watcher.current = null;
    setIsTracking(false);
    // Flush any remaining buffered points before stopping.
    if (upload && buffer.current.length > 0) {
      void flushBatch();
    }
    buffer.current = [];
  }, [upload, flushBatch]);

  const startTracking = useCallback(async () => {
    if (!enabled || watcher.current || starting.current) return;
    const attempt = ++generation.current;
    starting.current = true;
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (attempt !== generation.current) return;
      if (permission.status !== 'granted') {
        setError('Permiso de ubicación denegado');
        return;
      }
      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5000 },
        location => {
          if (attempt !== generation.current) return;
          // Drop low-accuracy samples client-side (server also drops > 50 m).
          if ((location.coords.accuracy ?? Infinity) > GPS_ACCURACY_FILTER_METERS) return;
          const point: GpsPoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            accuracy: location.coords.accuracy,
            timestamp: new Date(location.timestamp).toISOString(),
          };
          setPoints(previous => [...previous, point]);
          onPointRef.current?.(point);
          if (upload) {
            buffer.current.push(point);
            if (buffer.current.length >= MAX_GPS_BATCH_POINTS) {
              void flushBatch();
            }
          }
        },
      );
      if (attempt !== generation.current) {
        subscription.remove();
        return;
      }
      watcher.current = subscription;
      setIsTracking(true);
      // Periodic flush so points are not held indefinitely while running.
      if (upload) {
        flushTimer.current = setInterval(() => void flushBatch(), 15000);
      }
    } catch {
      if (attempt === generation.current) setError('No se pudo iniciar el GPS.');
    } finally {
      if (attempt === generation.current) starting.current = false;
    }
  }, [enabled, upload, workoutId, flushBatch, GPS_ACCURACY_FILTER_METERS, MAX_GPS_BATCH_POINTS]);

  useEffect(() => {
    setPoints([]);
  }, [workoutId, exerciseId]);

  useEffect(() => {
    if (enabled) void startTracking();
    else stopTracking();
    return stopTracking;
  }, [enabled, startTracking, stopTracking]);

  return { isTracking, points, startTracking, stopTracking, error };
}
