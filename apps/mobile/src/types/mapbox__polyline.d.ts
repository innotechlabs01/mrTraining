// Ambient type declaration for @mapbox/polyline (ships no types).
declare module '@mapbox/polyline' {
  export type Point = [number, number]

  /** Decode an encoded polyline string into an array of [lat, lng] pairs. */
  export function decode(encoded: string, precision?: number): Point[]

  /** Encode an array of [lat, lng] pairs into an encoded polyline string. */
  export function encode(points: Point[], precision?: number): string

  /** Encode a GeoJSON LineString coordinates array of [lon, lat] pairs. */
  export function fromGeoJSON(geojson: { type: 'LineString'; coordinates: number[][] }, precision?: number): string

  /** Decode to a GeoJSON LineString of [lon, lat] coordinates. */
  export function toGeoJSON(encoded: string, precision?: number): { type: 'LineString'; coordinates: number[][] }
}