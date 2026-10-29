/**
 * LocationAdapter — wrapper de expo-location para el TrackingEngine.
 *
 * Maneja permisos y suscripción a posiciones GPS. Es el único punto de
 * contacto con Expo Location, facilitando pruebas y mantenimiento.
 */

import * as Location from 'expo-location';
import type { UbicacionAdapter, GpsPointInput } from '../domain/TrackingEngine';

export class LocationAdapter implements UbicacionAdapter {
  private watcher: Location.LocationSubscription | null = null;

  async solicitarPermiso(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  }

  async iniciarSeguimiento(
    callback: (punto: GpsPointInput) => void
  ): Promise<{ remover: () => void }> {
    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        timeInterval: 5000,
      },
      (loc) => {
        callback({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          alt: loc.coords.altitude ?? null,
          accuracy: loc.coords.accuracy ?? null,
          timestamp: new Date().toISOString(),
        });
      }
    );

    this.watcher = sub;

    return {
      remover: () => {
        if (this.watcher) {
          this.watcher.remove();
          this.watcher = null;
        }
      },
    };
  }

  detenerSeguimiento(): void {
    if (this.watcher) {
      this.watcher.remove();
      this.watcher = null;
    }
  }
}

export const locationAdapter = new LocationAdapter();
