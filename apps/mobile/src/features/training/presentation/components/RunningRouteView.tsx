/**
 * RunningRouteView — shows a coach-defined running route on a map, traces the
 * athlete's live GPS position, calculates progress along the route, detects
 * off-route deviations, and optionally follows the user.
 *
 * The route is an encoded GPS polyline (lat,lng) attached to the workout exercise
 * (`gpsRoute`). Live position uses expo-location (permission-gated). All usage is
 * best-effort: a rejected permission or missing watch simply hides the marker.
 */
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, Share } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import polyline from '@mapbox/polyline';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import * as ViewShot from 'react-native-view-shot';
import { colors, spacing, typography, radius } from '../../../../shared/theme/tokens';
import { MapPinIcon } from '../../../../shared/components/icons';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.runningRouteView;

type Props = {
  gpsRoute: string;
  height?: number;
  followUser?: boolean;
  workoutId?: string;
  exerciseId?: string;
  onProgress?: (progress: RouteProgress) => void;
  enableVoiceCues?: boolean;
  enableHaptics?: boolean;
  onShare?: (uri: string) => void;
};

type LatLngPoint = { latitude: number; longitude: number };
type LocationCoords = { coords: { latitude: number; longitude: number } };

interface RouteProgress {
  distanceAlongRoute: number;
  totalDistance: number;
  progressPercent: number;
  isOffRoute: boolean;
  nearestPointIndex: number;
}

/**
 * Calculate distance between two lat/lng points in meters using Haversine.
 */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate total route distance in meters.
 */
function routeDistanceMeters(points: LatLngPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1].latitude, points[i - 1].longitude, points[i].latitude, points[i].longitude);
  }
  return total;
}

/**
 * Find nearest point on route to current position, returns index and distance along route.
 */
function findNearestOnRoute(
  position: LatLngPoint,
  routePoints: LatLngPoint[]
): { index: number; distanceAlong: number; distanceToRoute: number } {
  if (routePoints.length < 2) return { index: 0, distanceAlong: 0, distanceToRoute: 0 };

  let minDist = Infinity;
  let nearestIndex = 0;
  let distanceAlong = 0;

  for (let i = 0; i < routePoints.length - 1; i++) {
    const a = routePoints[i];
    const b = routePoints[i + 1];

    // Distance from position to segment a-b
    const distToSegment = distancePointToSegment(position, a, b);
    if (distToSegment < minDist) {
      minDist = distToSegment;
      nearestIndex = i;
      // Calculate distance along route up to the projection point
      distanceAlong = segmentDistanceAlongRoute(routePoints, i, position, a, b);
    }
  }

  // Add distance of all previous segments
  for (let i = 0; i < nearestIndex; i++) {
    distanceAlong += haversineMeters(
      routePoints[i].latitude,
      routePoints[i].longitude,
      routePoints[i + 1].latitude,
      routePoints[i + 1].longitude
    );
  }

  return { index: nearestIndex, distanceAlong, distanceToRoute: minDist };
}

/**
 * Distance from point to line segment (a-b) in meters.
 */
function distancePointToSegment(p: LatLngPoint, a: LatLngPoint, b: LatLngPoint): number {
  const A = p.latitude - a.latitude;
  const B = p.longitude - a.longitude;
  const C = b.latitude - a.latitude;
  const D = b.longitude - a.longitude;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;
  if (param < 0) {
    xx = a.latitude;
    yy = a.longitude;
  } else if (param > 1) {
    xx = b.latitude;
    yy = b.longitude;
  } else {
    xx = a.latitude + param * C;
    yy = a.longitude + param * D;
  }

  return haversineMeters(p.latitude, p.longitude, xx, yy);
}

/**
 * Distance along route up to projection point on segment i.
 */
function segmentDistanceAlongRoute(
  routePoints: LatLngPoint[],
  segmentIndex: number,
  position: LatLngPoint,
  a: LatLngPoint,
  b: LatLngPoint
): number {
  const A = position.latitude - a.latitude;
  const B = position.longitude - a.longitude;
  const C = b.latitude - a.latitude;
  const D = b.longitude - a.longitude;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = 0;
  if (lenSq !== 0) param = Math.max(0, Math.min(1, dot / lenSq));

  const projLat = a.latitude + param * C;
  const projLng = a.longitude + param * D;

  return haversineMeters(a.latitude, a.longitude, projLat, projLng);
}

/**
 * Format meters as km string.
 */
function formatDistanceKm(meters: number): string {
  return (meters / 1000).toFixed(2);
}

/**
 * Format duration seconds as mm:ss or hh:mm:ss.
 */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RunningRouteView({
  gpsRoute,
  height = 320,
  followUser = true,
  workoutId,
  exerciseId,
  onProgress,
  enableVoiceCues = true,
  enableHaptics = true,
  onShare,
}: Props) {
  // Decode the encoded polyline into map coordinates.
  const routePoints = useMemo<LatLngPoint[]>(() => {
    if (!gpsRoute) return [];
    try {
      const decoded = polyline.decode(gpsRoute) as [number, number][];
      return decoded.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
    } catch {
      return [];
    }
  }, [gpsRoute]);

  const [livePosition, setLivePosition] = useState<LatLngPoint | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [progress, setProgress] = useState<RouteProgress | null>(null);
  const [announcedKm, setAnnouncedKm] = useState<Set<number>>(new Set())
  const [offRouteAlerted, setOffRouteAlerted] = useState(false)
  const mapRef = useRef<any>(null);
  const viewShotRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const totalDistance = useMemo(() => routeDistanceMeters(routePoints), [routePoints]);

  // Voice cue for each km
  useEffect(() => {
    if (!enableVoiceCues || !progress || !livePosition) return
    const currentKm = Math.floor(progress.distanceAlongRoute / 1000)
    if (currentKm > 0 && !announcedKm.has(currentKm)) {
      setAnnouncedKm(prev => new Set(prev).add(currentKm))
      const pace = progress.totalDistance > 0 ? (progress.distanceAlongRoute / 1000) / (progress.distanceAlongRoute / progress.totalDistance) : 0 // rough
      Speech.speak(`Kilómetro ${currentKm} completado`, { language: 'es-ES', rate: 0.9 })
    }
  }, [progress?.distanceAlongRoute, enableVoiceCues, announcedKm])

  // Haptic feedback on off-route
  useEffect(() => {
    if (!enableHaptics || !progress) return
    if (progress.isOffRoute && !offRouteAlerted) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      setOffRouteAlerted(true)
    } else if (!progress.isOffRoute) {
      setOffRouteAlerted(false)
    }
  }, [progress?.isOffRoute, enableHaptics, offRouteAlerted])

  // Calculate progress when position or route changes
  useEffect(() => {
    if (!livePosition || routePoints.length < 2) {
      setProgress(null);
      return;
    }

    const { index: nearestIndex, distanceAlong, distanceToRoute } = findNearestOnRoute(livePosition, routePoints);
    const progressPercent = totalDistance > 0 ? Math.min(100, (distanceAlong / totalDistance) * 100) : 0;
    const isOffRoute = distanceToRoute > 50; // 50m threshold

    const newProgress: RouteProgress = {
      distanceAlongRoute: distanceAlong,
      totalDistance,
      progressPercent,
      isOffRoute,
      nearestPointIndex: nearestIndex,
    };

    setProgress(newProgress);
    onProgress?.(newProgress);
  }, [livePosition, routePoints, totalDistance, onProgress]);

  // Follow user location on map
  useEffect(() => {
    if (!followUser || !livePosition || !mapRef.current || !mapReady) return;
    mapRef.current.animateToRegion({
      latitude: livePosition.latitude,
      longitude: livePosition.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 1000);
  }, [livePosition, followUser, mapReady]);

  // Live position watcher
  useEffect(() => {
    if (routePoints.length === 0) return;
    let active = true;
    let watcher: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (active) setLocationDenied(true);
        return;
      }
      if (!active) return;
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 4000 },
        (loc: LocationCoords) => {
          if (!active) return;
          setLivePosition({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        },
      );
      if (active) watcher = sub;
    })();

    return () => {
      active = false;
      watcher?.remove();
    };
  }, [routePoints.length]);

  if (routePoints.length === 0) {
    return (
      <View style={[styles.wrapper, { height }]}>
        <Text style={styles.emptyText}>{t.empty}</Text>
      </View>
    );
  }

  const initialRegion = useMemo(
    () => ({
      latitude: routePoints[0].latitude,
      longitude: routePoints[0].longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }),
    [routePoints]
  );

  return (
    <View style={[styles.wrapper, { height }]}>
      <View style={[styles.mapBox, { height }]}>
        <ViewShot ref={viewShotRef} style={StyleSheet.absoluteFill} options={{ quality: 0.8, format: 'png' }}>
          <MapView
          ref={mapRef}
          onMapReady={() => setMapReady(true)}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          showsUserLocation={false}
          followsUserLocation={followUser}
          mapType="standard"
        >
          {/* Full route in light color */}
          <Polyline coordinates={routePoints} strokeColor={`${colors.primary}4D`} strokeWidth={3} />

          {/* Completed portion in solid color */}
          {progress && progress.nearestPointIndex > 0 && (
            <Polyline
              coordinates={routePoints.slice(0, progress.nearestPointIndex + 1)}
              strokeColor={colors.primary}
              strokeWidth={4}
            />
          )}

          {/* Remaining portion */}
          {progress && progress.nearestPointIndex < routePoints.length - 1 && (
            <Polyline
              coordinates={routePoints.slice(progress.nearestPointIndex)}
              strokeColor={`${colors.textSecondary}80`}
              strokeWidth={2}
            />
          )}

          {/* Start marker */}
          <Marker coordinate={routePoints[0]} title={t.markerStart} pinColor={colors.primary} />
          {/* End marker */}
          <Marker
            coordinate={routePoints[routePoints.length - 1]}
            title={t.markerEnd}
            pinColor={colors.textSecondary}
          />

          {/* Live position marker with pulsing effect */}
          {livePosition && (
            <Marker
              coordinate={livePosition}
              title={t.markerYou}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
            >
              <View style={styles.liveMarker}>
                <MapPinIcon size={28} color={progress?.isOffRoute ? colors.error : colors.primary} />
                {progress?.isOffRoute && <View style={styles.offRouteBadge} />}
              </View>
            </Marker>
          )}

          {/* Distance markers every km */}
          {routePoints.length > 10 && (
            <>
              {(() => {
                const markers: React.ReactElement[] = [];
                let accum = 0;
                for (let i = 1; i < routePoints.length - 1; i++) {
                  const d = haversineMeters(
                    routePoints[i - 1].latitude,
                    routePoints[i - 1].longitude,
                    routePoints[i].latitude,
                    routePoints[i].longitude
                  );
                  accum += d;
                  if (accum >= 1000) {
                    markers.push(
                      <Marker
                        key={`km-${markers.length}`}
                        coordinate={routePoints[i]}
                        title={`${Math.round(accum / 1000)} km`}
                        pinColor={colors.textSecondary}
                      >
                        <Text style={styles.kmMarker}>{Math.round(accum / 1000)}k</Text>
                      </Marker>
                    );
                    accum = 0;
                  }
                }
                return markers;
              })()}
            </>
          )}
        </MapView>
        </ViewShot>
      </View>

      {/* Progress bar */}
      {progress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <View style={[styles.progressTrack]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, progress.progressPercent)}%` },
                  { backgroundColor: progress.isOffRoute ? colors.error : colors.primary },
                ]}
              />
            </View>
            {onShare && (
              <TouchableOpacity
                onPress={async () => {
                  if (viewShotRef.current) {
                    try {
                      const uri = await viewShotRef.current.capture()
                      onShare(uri)
                      Share.share({ url: uri, message: `Mi carrera: ${formatDistanceKm(progress.distanceAlongRoute)} / ${formatDistanceKm(progress.totalDistance)} km` })
                    } catch (e) {
                      console.error('Share capture failed:', e)
                    }
                  }
                }}
                style={styles.shareButton}
              >
                <Text style={styles.shareButtonText}>Compartir</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>
              {formatDistanceKm(progress.distanceAlongRoute)} / {formatDistanceKm(progress.totalDistance)} km
            </Text>
            <Text style={[styles.progressLabel, { fontWeight: '600', color: progress.isOffRoute ? colors.error : colors.primary }]}>
              {progress.progressPercent.toFixed(0)}%
            </Text>
          </View>
          {progress.isOffRoute && (
            <Text style={styles.offRouteText}>⚠ {t.offRoute}</Text>
          )}
        </View>
      )}

      {/* Caption */}
      <Text style={styles.caption}>
        {locationDenied
          ? t.locationDenied
          : progress
            ? `${t.pointsCaption.replace('{n}', String(routePoints.length))} • ${t.progress}: ${progress.progressPercent.toFixed(0)}%`
            : t.pointsCaption.replace('{n}', String(routePoints.length))}
      </Text>

      {/* Off-route warning banner */}
      {progress?.isOffRoute && (
        <View style={styles.offRouteBanner}>
          <Text style={styles.offRouteBannerText}>{t.offRouteWarning}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  mapBox: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  caption: {
    marginTop: spacing.sm,
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  liveMarker: {
    position: 'relative',
  },
  offRouteBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.background,
  },
  kmMarker: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  progressContainer: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  shareButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  shareButtonText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  progressLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  offRouteText: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
  },
  offRouteBanner: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.error + '20',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  offRouteBannerText: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
    fontWeight: '600',
  },
});