import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { apiClient } from '../../../infrastructure/api/client';

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

  const stopTracking = useCallback(() => {
    generation.current += 1;
    starting.current = false;
    watcher.current?.remove();
    watcher.current = null;
    setIsTracking(false);
  }, []);

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
          if (attempt !== generation.current || (location.coords.accuracy ?? Infinity) > 50) return;
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
            // Each sample is sent once. Completion also includes the full route.
            void apiClient.post(`/running/sessions/${workoutId}/live-location`, {
              lat: point.latitude, lng: point.longitude, alt: point.altitude,
              timestamp: point.timestamp, accuracy: point.accuracy,
            }).catch(() => setError('No se pudo sincronizar la ubicación.'));
          }
        },
      );
      if (attempt !== generation.current) {
        subscription.remove();
        return;
      }
      watcher.current = subscription;
      setIsTracking(true);
    } catch {
      if (attempt === generation.current) setError('No se pudo iniciar el GPS.');
    } finally {
      if (attempt === generation.current) starting.current = false;
    }
  }, [enabled, upload, workoutId]);

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
