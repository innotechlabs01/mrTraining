'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import polyline from '@mapbox/polyline'
import type { Map as LeafletMap, LatLngBounds, DivIcon } from 'leaflet'

// react-leaflet (and leaflet itself) touch window at import time — never SSR them.
const MapContainer = dynamic(
  () => import('react-leaflet').then((m) => m.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((m) => m.TileLayer),
  { ssr: false }
)
const Polyline = dynamic(
  () => import('react-leaflet').then((m) => m.Polyline),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then((m) => m.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then((m) => m.Popup),
  { ssr: false }
)

export interface GpsPoint {
  lat: number
  lng: number
  alt?: number
  timestamp?: string
  accuracy?: number
}

interface RunningRouteMapProps {
  points: GpsPoint[] | string // array of points OR encoded polyline string
  center?: [number, number]   // [lat, lng] fallback when no route
  zoom?: number
  className?: string
  height?: string
  showMarkers?: boolean
  /** Fit map bounds to the whole route instead of a fixed zoom. */
  fitBounds?: boolean
  /** Minimal mode for list thumbnails: no controls, bounds fixed on load. */
  thumbnail?: boolean
  /** Current live position marker (web live tracking). */
  livePosition?: { lat: number; lng: number } | null
}

/** Decimate very long routes so Leaflet stays smooth. Keeps first/last. */
function decimate(coords: [number, number][], maxPoints: number): [number, number][] {
  if (coords.length <= maxPoints) return coords
  const step = Math.ceil(coords.length / maxPoints)
  const out: [number, number][] = []
  for (let i = 0; i < coords.length - 1; i += step) out.push(coords[i])
  out.push(coords[coords.length - 1])
  return out
}

/** Fits the viewport to the route whenever points change. Child of MapContainer. */
function RouteBounds({
  coords,
  enabled,
  L,
  useMap,
}: {
  coords: [number, number][]
  enabled: boolean
  L: typeof import('leaflet')
  useMap: typeof import('react-leaflet')['useMap']
}) {
  const map: LeafletMap = useMap()

  useEffect(() => {
    if (!enabled || coords.length === 0) return
    if (coords.length === 1) {
      map.setView(coords[0], 15)
      return
    }
    const bounds: LatLngBounds = coords.reduce(
      (b, [lat, lng]) => b.extend([lat, lng]),
      new L.LatLngBounds(coords[0], coords[0])
    )
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [coords, enabled, map, L])

  return null
}

export function RunningRouteMap({
  points,
  center = [-34.6037, -58.3816], // Buenos Aires default
  zoom = 13,
  className = '',
  height = '400px',
  showMarkers = true,
  fitBounds = true,
  thumbnail = false,
  livePosition = null,
}: RunningRouteMapProps) {
  const mapRef = useRef<LeafletMap | null>(null)
  const [L, setL] = useState<typeof import('leaflet') | null>(null)

  const [useMap, setUseMap] = useState<typeof import('react-leaflet')['useMap'] | null>(null)

  useEffect(() => {
    let mounted = true
    Promise.all([
      import('leaflet'),
      import('react-leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([leaflet, rl]) => {
      if (mounted) {
        setL(leaflet)
        setUseMap(() => rl.useMap)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  const decoded = useMemo<[number, number][]>(() => {
    let coords: [number, number][]
    if (typeof points === 'string') {
      try {
        coords = polyline.decode(points) as [number, number][]
      } catch {
        coords = []
      }
    } else {
      coords = points.map((p) => [p.lat, p.lng])
    }
    return decimate(coords, thumbnail ? 300 : 2500)
  }, [points, thumbnail])

  // Custom brand pin — Leaflet's default marker assets break under Next.js bundling.
  const brandIcon: DivIcon | undefined = useMemo(() => {
    if (!L) return undefined
    return L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;border-radius:9999px;background:#15AAF2;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    })
  }, [L])

  if (!L) {
    return (
      <div className={className} style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
        </div>
      </div>
    )
  }

  if (decoded.length === 0) {
    return (
      <div className={className} style={{ height }}>
        <div className="flex items-center justify-center h-full text-white/40 text-sm">
          No route data available
        </div>
      </div>
    )
  }

  const mapCenter: [number, number] = decoded[0] ?? center

  return (
    <div className={className} style={{ height, position: 'relative' }}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        ref={(el) => {
          mapRef.current = el
        }}
        style={{ height: '100%', width: '100%' }}
        preferCanvas
        zoomControl={!thumbnail}
        dragging={!thumbnail}
        scrollWheelZoom={!thumbnail}
        doubleClickZoom={!thumbnail}
        touchZoom={!thumbnail}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {useMap && (
          <RouteBounds coords={decoded} enabled={fitBounds} L={L} useMap={useMap} />
        )}
        {decoded.length > 1 && (
          <Polyline
            positions={decoded}
            color="#15AAF2"
            weight={thumbnail ? 2 : 3}
            opacity={0.8}
            lineJoin="round"
          />
        )}
        {!thumbnail && showMarkers && brandIcon && (
          <>
            <Marker position={decoded[0]} icon={brandIcon}>
              <Popup>Inicio</Popup>
            </Marker>
            <Marker position={decoded[decoded.length - 1]} icon={brandIcon}>
              <Popup>Fin</Popup>
            </Marker>
          </>
        )}
        {livePosition && brandIcon && (
          <Marker
            position={[livePosition.lat, livePosition.lng]}
            icon={brandIcon}
          >
            <Popup>Posición actual</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
