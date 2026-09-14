/**
 * RunningRouteView — shows a coach-defined running route on a map and traces the
 * athlete's live GPS position along it so they can follow the recorrido.
 *
 * The route is an encoded GPS polyline (lat,lng) attached to the workout exercise
 * (`gpsRoute`). Live position uses expo-location (permission-gated). All usage is
 * best-effort: a rejected permission or missing watch simply hides the marker.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import polyline from '@mapbox/polyline';
import * as Location from 'expo-location';
import { colors, spacing, typography, radius } from '../../../../shared/theme/tokens';
import { MapPinIcon } from '../../../../shared/components/icons';

type Props = {
  gpsRoute: string;
  height?: number;
};

type LatLngPoint = { latitude: number; longitude: number };
type LocationCoords = { coords: { latitude: number; longitude: number } };

export function RunningRouteView({ gpsRoute, height = 320 }: Props) {
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

  // Follow the athlete's GPS position along the route.
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
  }, [routePoints.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (routePoints.length === 0) {
    return (
      <View style={[styles.wrapper, { height }]}>
        <Text style={styles.emptyText}>Esta sesión no incluye una ruta de running.</Text>
      </View>
    );
  }

  const region = {
    latitude: routePoints[0].latitude,
    longitude: routePoints[0].longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.mapBox, { height }]}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          showsUserLocation={false}
          mapType="standard"
        >
          <Polyline
            coordinates={routePoints}
            strokeColor={colors.primary}
            strokeWidth={4}
          />
          <Marker coordinate={routePoints[0]} title="Inicio" pinColor={colors.primary} />
          <Marker
            coordinate={routePoints[routePoints.length - 1]}
            title="Fin"
            pinColor={colors.textSecondary}
          />
          {livePosition ? (
            <Marker coordinate={livePosition} title="Tú" anchor={{ x: 0.5, y: 1 }}>
              <MapPinIcon size={32} color={colors.primary} />
            </Marker>
          ) : null}
        </MapView>
      </View>
      <Text style={styles.caption}>
        {locationDenied
          ? 'Permite la ubicación para seguir tu recorrido en el mapa.'
          : `${routePoints.length} puntos · Sigue la línea en el mapa.`}
      </Text>
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
});