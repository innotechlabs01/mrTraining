import { useEffect, useRef, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { apiClient } from '../../../infrastructure/api/client';

export interface GpsPoint {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  timestamp: string;
}

interface UseGpsTrackingOptions {
  workoutId: string;
  exerciseId: string;
  enabled: boolean;
  onPoint?: (point: GpsPoint) => void;
}

interface UseGpsTrackingResult {
  isTracking: boolean;
  points: GpsPoint[];
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  error: string | null;
}

export function useGpsTracking({
  workoutId,
  exerciseId,
  enabled,
  onPoint,
}: UseGpsTrackingOptions): UseGpsTrackingResult {
  const [isTracking, setIsTracking] = useState(false);
  const [points, setPoints] = useState<GpsPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const pointsRef = useRef<GpsPoint[]>([]);

  const requestPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  }, []);

  const startTracking = useCallback(async () => {
    if (!enabled) return;
    const granted = await requestPermission();
    if (!granted) {
      setError('Permiso de ubicación denegado');
      return;
    }

    setError(null);
    pointsRef.current = [];
    setPoints([]);
    setIsTracking(true);

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        timeInterval: 5000,
      },
      (loc) => {
        const point: GpsPoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          altitude: loc.coords.altitude ?? null,
          accuracy: loc.coords.accuracy ?? null,
          timestamp: new Date().toISOString(),
        };
        pointsRef.current = [...pointsRef.current, point];
        setPoints([...pointsRef.current]);
        onPoint?.(point);

        // Send to API in batches
        if (pointsRef.current.length % 10 === 0) {
          sendBatch(pointsRef.current.slice(-10));
        }
      }
    );
    watcherRef.current = sub;

    // Flush every 30 seconds
    intervalRef.current = setInterval(() => {
      if (pointsRef.current.length > 0) {
        sendBatch(pointsRef.current);
      }
    }, 30000);
  }, [enabled, onPoint, requestPermission]);

  const sendBatch = async (batch: GpsPoint[]) => {
    try {
      // Use the live-location endpoint for each point
      for (const point of batch) {
        await apiClient.post(
          `/athlete/running/sessions/${workoutId}/live-location`,
          {
            session_id: workoutId,
            lat: point.latitude,
            lng: point.longitude,
            alt: point.altitude,
            timestamp: point.timestamp,
            accuracy: point.accuracy,
          }
        );
      }
    } catch (e) {
      console.error('Failed to send GPS batch:', e);
    }
  };

  const stopTracking = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
    }
    // Flush remaining points
    if (pointsRef.current.length > 0) {
      await sendBatch(pointsRef.current);
    }
    setIsTracking(false);
  }, [sendBatch]);

  useEffect(() => {
    if (enabled && !isTracking) {
      startTracking();
    } else if (!enabled && isTracking) {
      stopTracking();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watcherRef.current) watcherRef.current.remove();
    };
  }, [enabled, isTracking, startTracking, stopTracking]);

  return { isTracking, points, startTracking, stopTracking, error };
}