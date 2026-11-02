/**
 * Wire format for POST /api/v1/running/sessions/import.
 *
 * Kept pure (types only) so the contract with the Go DTO can be unit-tested
 * without loading native health modules.
 */
import type { DeviceActivity } from './types';

/** One session as accepted by dto.ImportSessionRequest (snake_case). */
export interface ImportSessionPayload {
  external_id: string;
  source: string;
  device_name: string;
  device_brand: string;
  date: string;
  distance: number;
  duration: number;
  calories: number;
  elevation: number;
  heart_rate: number;
  cadence: number;
  points: Array<{
    lat: number;
    lng: number;
    alt: number;
    timestamp: string;
    accuracy: number;
  }>;
}

/** Maps a device activity to the API's import shape. */
export function toImportPayload(a: DeviceActivity): ImportSessionPayload {
  return {
    external_id: a.externalId,
    source: a.source,
    device_name: a.deviceName,
    device_brand: a.deviceBrand,
    date: a.date,
    distance: a.distanceKm,
    duration: a.durationSec,
    calories: a.calories,
    elevation: a.elevationM ?? 0,
    heart_rate: a.heartRate ?? 0,
    cadence: a.cadence ?? 0,
    points: a.route.map(p => ({
      lat: p.lat,
      lng: p.lng,
      alt: p.alt ?? 0,
      timestamp: p.timestamp,
      accuracy: p.accuracy ?? 0,
    })),
  };
}
