import { useCallback, useEffect, useRef, useState } from 'react';
import polyline from '@mapbox/polyline';
import { smartClient } from '../../../infrastructure/api/client';
import { mmkvSetJson, mmkvRemove, userScopedKey } from '../../../infrastructure/storage/mmkv';
import { haversineMetros } from '../domain/TrackingEngine';
import { useGpsTracking, type GpsPoint } from '../hooks/useGpsTracking';
import type { CompleteRunningSessionRequest } from './useRunningWorkouts';
import { readRunningCompletion } from './runningCompletion';

/** Foreground recording; never navigate away until the server confirms save. */
export function useGuidedRunningSession(sessionId: string, enabled: boolean) {
  const [cacheKey] = useState(() => userScopedKey(`running:completion:${sessionId}`));
  const [restored] = useState(() => readRunningCompletion(cacheKey));
  const [isPaused, setPaused] = useState(!!restored);
  const [isSaving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [distanceKm, setDistanceKm] = useState(restored?.distance ?? 0);
  const [durationSeconds, setDurationSeconds] = useState(restored?.duration ?? 0);
  const samples = useRef<GpsPoint[]>([]);
  const lastPoint = useRef<GpsPoint | null>(null);
  const distanceMeters = useRef(0);
  const elapsedMs = useRef(0);
  const activeSince = useRef<number | null>(null);
  const saving = useRef(false);
  const completed = useRef(false);
  const pendingPayload = useRef<CompleteRunningSessionRequest | null>(restored);

  const onPoint = useCallback((point: GpsPoint) => {
    if (saving.current || completed.current) return;
    const previous = lastPoint.current;
    if (previous) {
      const seconds = (Date.parse(point.timestamp) - Date.parse(previous.timestamp)) / 1000;
      const meters = haversineMetros(previous.latitude, previous.longitude, point.latitude, point.longitude);
      // Discard nonmonotonic samples and GPS jumps, not legitimate movement.
      if (seconds <= 0 || meters / seconds > 8) return;
      if (seconds <= 300 && meters >= 1) distanceMeters.current += meters;
    }
    lastPoint.current = point;
    samples.current.push(point);
    setDistanceKm(distanceMeters.current / 1000);
  }, []);

  const gps = useGpsTracking({
    workoutId: sessionId, exerciseId: sessionId,
    enabled: enabled && !!sessionId && !isPaused && !isSaving,
    onPoint, upload: false,
  });

  const elapsed = useCallback(() => elapsedMs.current + (
    activeSince.current === null ? 0 : Date.now() - activeSince.current
  ), []);

  useEffect(() => {
    if (!gps.isTracking || isPaused || isSaving) return;
    activeSince.current = Date.now();
    const timer = setInterval(() => setDurationSeconds(Math.floor(elapsed() / 1000)), 1000);
    return () => {
      elapsedMs.current = elapsed();
      activeSince.current = null;
      clearInterval(timer);
    };
  }, [elapsed, gps.isTracking, isPaused, isSaving]);

  const togglePause = useCallback(() => {
    if (saving.current || completed.current || pendingPayload.current) return;
    lastPoint.current = null; // Never count travel while recording was paused.
    setPaused(previous => !previous);
  }, []);

  const finish = useCallback(async (): Promise<boolean> => {
    if (completed.current) return true;
    if (saving.current || !sessionId) return false;
    saving.current = true;
    setSaving(true);
    setSaveError(null);
    setPaused(true);
    gps.stopTracking();
    const duration = Math.floor(elapsed() / 1000);
    const distance = distanceMeters.current / 1000;
    const paceSeconds = distance > 0 ? Math.round(duration / distance) : 0;
    const payload: CompleteRunningSessionRequest = pendingPayload.current ?? {
      distance, duration,
      pace: `${Math.floor(paceSeconds / 60)}:${String(paceSeconds % 60).padStart(2, '0')}`,
      // No wearable is connected: do not invent physiological measurements.
      calories: 0, elevation: 0, heart_rate: 0, cadence: 0,
      gps_route: polyline.encode(samples.current.map(p => [p.latitude, p.longitude])),
    };
    pendingPayload.current = payload;
    setDurationSeconds(payload.duration);
    try {
      // GPS routes exceed SecureStore's small-secret limits and its key syntax.
      // Keep bulk completion data in the existing user-scoped MMKV cache.
      mmkvSetJson(cacheKey, payload);
      await smartClient.post(`/running/workouts/sessions/${sessionId}/complete`, payload);
      completed.current = true;
      // A cleanup failure after server success must not resubmit completion.
      try { mmkvRemove(cacheKey); } catch { /* Server already confirmed completion. */ }
      return true;
    } catch {
      setSaveError('No se pudo guardar la sesión. Reintenta sin salir de esta pantalla.');
      return false;
    } finally {
      saving.current = false;
      setSaving(false);
    }
  }, [cacheKey, elapsed, gps.stopTracking, sessionId]);

  const paceSeconds = distanceKm > 0 ? Math.round(durationSeconds / distanceKm) : null;
  const pace = paceSeconds === null ? '—' : `${Math.floor(paceSeconds / 60)}:${String(paceSeconds % 60).padStart(2, '0')}`;
  return { isPaused, isSaving, saveError, distanceKm, durationSeconds, pace,
    gpsError: gps.error, retryGps: gps.startTracking, togglePause, finish };
}
