/**
 * Small geo/date helpers shared by the health bridges.
 *
 * Device sync needs three things from a workout that the platform SDKs do not
 * agree on: a local calendar day, a rounded distance, and a distance fallback
 * derived from the route when the device omits totals.
 */
import type { RoutePoint } from './types';

export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Local calendar day (YYYY-MM-DD) — "today's run" must not shift by timezone. */
export function localDate(d: Date): string {
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Haversine distance in km. */
export function haversineKm(a: RoutePoint, b: RoutePoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Above this a step is a GPS glitch, not a stride (world-class pace is ~21 km/h). */
const MAX_PLAUSIBLE_SPEED_KMH = 25;
/** A single sample gap longer than this is treated as a re-lock, not a run. */
const MAX_STEP_KM = 5;

/**
 * Total route distance in km.
 *
 * Gaps are judged by implied speed rather than raw distance: watches sample
 * every few seconds, so a 1km hop in 5 minutes is a real split while the same
 * 1km in 5 seconds is a GPS jump that must not be counted.
 */
export function routeDistanceKm(points: RoutePoint[]): number {
  let km = 0;
  for (let i = 1; i < points.length; i++) {
    const step = haversineKm(points[i - 1], points[i]);
    if (step > MAX_STEP_KM) continue;

    const dtMs = Date.parse(points[i].timestamp) - Date.parse(points[i - 1].timestamp);
    if (Number.isFinite(dtMs) && dtMs > 0) {
      const speedKmh = step / (dtMs / 3600000);
      if (speedKmh > MAX_PLAUSIBLE_SPEED_KMH) continue;
    }
    km += step;
  }
  return km;
}
