/**
 * RunRecordingScreen — records a running session with GPS on the mobile app.
 *
 * GPS config (plan v2 §1E): high accuracy, 5s / 5m sampling, client accuracy
 * filter >30m, batched upload every 15s or 40 points, points persisted to
 * MMKV before upload (offline-first; retried on next tick / next mount).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import polyline from '@mapbox/polyline';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { secureStorage } from '../../../../infrastructure/storage/mmkv';
import { colors, spacing, radius } from '../../../../shared/theme/tokens';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'RunRecording'>;

type Point = {
  lat: number;
  lng: number;
  alt?: number | undefined;
  timestamp: string;
  accuracy?: number | undefined;
};

type TrackingState = 'idle' | 'recording' | 'paused' | 'saving';

const BATCH_INTERVAL_MS = 15_000;
const IDLE_PAUSE_MS = 90_000;
const QUEUE_KEY = 'running:queue';
const SESSION_KEY = 'running:activeSession';

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function RunRecordingScreen({ navigation }: Props) {
  const [state, setState] = useState<TrackingState>('idle');
  const [distanceM, setDistanceM] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [points, setPoints] = useState<Point[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const queueRef = useRef<Point[]>([]);
  const sentCountRef = useRef(0);
  const lastPointRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastMoveRef = useRef(0);
  const pausedRef = useRef(false);
  const startedAtRef = useRef(0);
  const resumedMsRef = useRef(0);
  const resumeAtRef = useRef(0);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const batchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const distanceRef = useRef(0);

  const persistQueue = useCallback(async () => {
    try {
      await secureStorage.setItem(QUEUE_KEY, JSON.stringify(queueRef.current.slice(-1000)));
    } catch {
      /* storage full — upload retry still works in memory */
    }
  }, []);

  const flush = useCallback(async () => {
    if (!sessionIdRef.current) return;
    const pending = queueRef.current.slice(sentCountRef.current);
    if (pending.length === 0) return;
    const chunk = pending.slice(0, 100);
    try {
      await apiClient.post(`/athlete/running/sessions/${sessionIdRef.current}/live-location`, {
        points: chunk,
      });
      sentCountRef.current += chunk.length;
      await persistQueue();
    } catch {
      // keep pending for next tick; persisted queue survives restarts
      await persistQueue();
    }
  }, [persistQueue]);

  const startWatch = useCallback(async () => {
    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000,
        distanceInterval: 5,
      },
      (loc) => {
        if (pausedRef.current) return;
        if ((loc.coords.accuracy ?? 0) > 30) return;

        const point: Point = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          alt: loc.coords.altitude ?? undefined,
          timestamp: new Date(loc.timestamp).toISOString(),
          accuracy: loc.coords.accuracy ?? undefined,
        };

        const prev = lastPointRef.current;
        if (prev) {
          const d = haversineMeters(prev, point);
          if (d < 1) return;
          distanceRef.current += d;
          setDistanceM(distanceRef.current);
        }
        lastPointRef.current = { lat: point.lat, lng: point.lng };
        lastMoveRef.current = Date.now();

        queueRef.current.push(point);
        setPoints((cur) => (cur.length < 5000 ? [...cur, point] : cur));
        void persistQueue();
        if (queueRef.current.length - sentCountRef.current >= 40) void flush();
      }
    );
    watchRef.current = sub;
  }, [flush, persistQueue]);

  const stopWatch = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
  }, []);

  const handleStart = useCallback(async () => {
    setError(null);
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      setError('Permiso de ubicación denegado. Activalo para grabar tu carrera.');
      return;
    }
    // Background permission is best-effort; the run still records in foreground.
    try {
      await Location.requestBackgroundPermissionsAsync();
    } catch {
      /* not available on this device / platform */
    }

    try {
      const { data } = await apiClient.post('/athlete/running/sessions', {
        date: new Date().toISOString().slice(0, 10),
        distance: 0,
        duration: 0,
        source: 'mobile_gps',
      });
      const id = (data as { id?: string; data?: { id?: string } })?.id ??
        (data as { data?: { id?: string } })?.data?.id;
      if (!id) throw new Error('missing session id');
      sessionIdRef.current = id;
      await secureStorage.setItem(SESSION_KEY, id);
    } catch {
      setError('No se pudo crear la sesión. Revisá tu conexión e intentá de nuevo.');
      return;
    }

    distanceRef.current = 0;
    setDistanceM(0);
    setElapsedMs(0);
    setPoints([]);
    queueRef.current = [];
    sentCountRef.current = 0;
    lastPointRef.current = null;
    lastMoveRef.current = Date.now();
    pausedRef.current = false;
    startedAtRef.current = Date.now();
    resumedMsRef.current = 0;
    setState('recording');

    await startWatch();
    batchTimerRef.current = setInterval(() => void flush(), BATCH_INTERVAL_MS);
    tickRef.current = setInterval(() => {
      if (pausedRef.current) return;
      setElapsedMs(Date.now() - startedAtRef.current - resumedMsRef.current);
      if (Date.now() - lastMoveRef.current > IDLE_PAUSE_MS) {
        pausedRef.current = true;
        resumeAtRef.current = Date.now();
        setState('paused');
        stopWatch();
      }
    }, 1000);
  }, [flush, startWatch, stopWatch]);

  const handlePauseResume = useCallback(() => {
    if (state === 'recording') {
      pausedRef.current = true;
      resumeAtRef.current = Date.now();
      setState('paused');
      stopWatch();
    } else if (state === 'paused') {
      resumedMsRef.current += Date.now() - resumeAtRef.current;
      pausedRef.current = false;
      setState('recording');
      void startWatch();
    }
  }, [state, startWatch, stopWatch]);

  const handleFinish = useCallback(async () => {
    if (!sessionIdRef.current) return;
    setState('saving');
    stopWatch();
    if (batchTimerRef.current) clearInterval(batchTimerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);

    await flush();
    const coords = queueRef.current.map((p) => [p.lat, p.lng] as [number, number]);
    const route = coords.length >= 2 ? polyline.encode(coords) : '';
    const durationSec = Math.max(
      1,
      Math.round((Date.now() - startedAtRef.current - resumedMsRef.current) / 1000)
    );
    const distanceKm = Number((distanceRef.current / 1000).toFixed(3));

    try {
      await apiClient.patch(`/athlete/running/sessions/${sessionIdRef.current}`, {
        distance: distanceKm,
        duration: durationSec,
        gps_route: route,
      });
      await secureStorage.removeItem(QUEUE_KEY);
      await secureStorage.removeItem(SESSION_KEY);
      sessionIdRef.current = null;
      setState('idle');
      Alert.alert('Carrera guardada', `${distanceKm.toFixed(2)} km · ${formatDuration(durationSec)}`);
      navigation.goBack();
    } catch {
      // Offline: keep session id + queue persisted; retry on next mount.
      setError('Sin conexión: la carrera quedó guardada en el dispositivo y se sincronizará al volver.');
      setState('paused');
    }
  }, [flush, navigation, stopWatch]);

  // Retry a pending session from a previous offline finish.
  useEffect(() => {
    void (async () => {
      const pendingSession = await secureStorage.getItem(SESSION_KEY);
      if (!pendingSession) return;
      const raw = await secureStorage.getItem(QUEUE_KEY);
      if (!raw) return;
      try {
        const queue = JSON.parse(raw) as Point[];
        const coords = queue.map((p) => [p.lat, p.lng] as [number, number]);
        const route = coords.length >= 2 ? polyline.encode(coords) : '';
        let distance = 0;
        for (let i = 1; i < queue.length; i++) distance += haversineMeters(queue[i - 1], queue[i]);
        const first = queue[0]?.timestamp ? Date.parse(queue[0].timestamp) : Date.now();
        const last = queue[queue.length - 1]?.timestamp
          ? Date.parse(queue[queue.length - 1].timestamp)
          : Date.now();
        await apiClient.patch(`/athlete/running/sessions/${pendingSession}`, {
          distance: Number((distance / 1000).toFixed(3)),
          duration: Math.max(1, Math.round((last - first) / 1000)),
          gps_route: route,
        });
        await secureStorage.removeItem(QUEUE_KEY);
        await secureStorage.removeItem(SESSION_KEY);
      } catch {
        /* still offline — keep it for the next open */
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      stopWatch();
      if (batchTimerRef.current) clearInterval(batchTimerRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [stopWatch]);

  const routeCoords = useMemo(
    () => points.map((p) => ({ latitude: p.lat, longitude: p.lng })),
    [points]
  );

  const pace =
    distanceM > 0 && elapsedMs > 0
      ? formatDuration(Math.round(elapsedMs / 1000 / (distanceM / 1000)))
      : '—';

  const initialRegion = point0(points);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.mapWrap}>
        {initialRegion ? (
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={initialRegion}
            showsUserLocation
          >
            {routeCoords.length > 1 && (
              <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={4} />
            )}
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>El mapa aparecerá al recibir señal GPS</Text>
          </View>
        )}
      </View>

      <View style={styles.panel}>
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Distancia</Text>
            <Text style={styles.metricValue}>{(distanceM / 1000).toFixed(2)} km</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Tiempo</Text>
            <Text style={styles.metricValue}>{formatDuration(Math.round(elapsedMs / 1000))}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Ritmo</Text>
            <Text style={styles.metricValue}>{pace} /km</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {state === 'idle' ? (
          <Pressable style={styles.primaryBtn} onPress={() => void handleStart()}>
            <Text style={styles.primaryBtnText}>Grabar carrera</Text>
          </Pressable>
        ) : (
          <View style={styles.row}>
            <Pressable
              style={[styles.secondaryBtn, state === 'saving' && styles.disabled]}
              onPress={handlePauseResume}
              disabled={state === 'saving'}
            >
              <Text style={styles.secondaryBtnText}>
                {state === 'recording' ? 'Pausar' : 'Reanudar'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.stopBtn, state === 'saving' && styles.disabled]}
              onPress={() => void handleFinish()}
              disabled={state === 'saving'}
            >
              <Text style={styles.primaryBtnText}>
                {state === 'saving' ? 'Guardando…' : 'Finalizar'}
              </Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.hint}>
          GPS de alta precisión cada 5 s / 5 m. Los puntos se guardan en el
          dispositivo y se sincronizan si se corta la conexión.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function point0(points: Point[]) {
  if (points.length === 0) return null;
  return {
    latitude: points[points.length - 1].lat,
    longitude: points[points.length - 1].lng,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  mapWrap: { flex: 1, backgroundColor: colors.surface },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  mapPlaceholderText: { color: colors.textSecondary, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  panel: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  metrics: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  metric: { flex: 1 },
  metricLabel: { color: colors.textSecondary, fontSize: 11, textTransform: 'uppercase' },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: '700' },
  error: { color: colors.error, fontSize: 12, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryBtnText: { color: colors.text, fontWeight: '600', fontSize: 15 },
  stopBtn: {
    flex: 1,
    backgroundColor: colors.error,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  hint: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: 11, lineHeight: 15 },
});
