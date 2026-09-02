'use client'

import { useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents } from 'react-leaflet'
import { MapPin, Trash2, Undo2 } from 'lucide-react'
import polyline from '@mapbox/polyline'
import type { LatLngExpression } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { cn } from '@/lib/utils'

// Fix default marker icon asset paths (Vite/Next bundling).
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: markerIcon.src ?? markerIcon,
  iconRetinaUrl: markerIcon2x.src ?? markerIcon2x,
  shadowUrl: markerShadow.src ?? markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

const RUNNING_START: LatLngExpression = [-34.6037, -58.3816] // Buenos Aires default

type LatLngPair = [number, number] // [lat, lng]

function decodeRoute(encoded: string | undefined): LatLngPair[] {
  if (!encoded) return []
  try {
    const pts = polyline.decode(encoded) as LatLngPair[]
    return pts
  } catch {
    return []
  }
}

function encodeRoute(pts: LatLngPair[]): string {
  if (pts.length === 0) return ''
  // @mapbox/polyline expects [lat, lng] pairs.
  return polyline.encode(pts)
}

function ClickCatcher({ onAdd }: { onAdd: (p: LatLngPair) => void }) {
  useMapEvents({
    click(e) {
      onAdd([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

interface RouteMapEditorProps {
  value?: string
  onChange: (encoded: string) => void
  height?: string
}

export function RouteMapEditor({ value, onChange, height = '260px' }: RouteMapEditorProps) {
  const points = decodeRoute(value)

  const fitRef = useRef<L.Map | null>(null)

  const addPoint = useCallback((p: LatLngPair) => {
    onChange(encodeRoute([...points, p]))
  }, [points, onChange])

  const removeLast = useCallback(() => {
    const next = [...points]
    next.pop()
    onChange(encodeRoute(next))
  }, [points, onChange])

  const clear = useCallback(() => {
    onChange('')
  }, [onChange])

  useEffect(() => {
    // Recenter/fit after mount and whenever points change to keep route visible.
    if (fitRef.current && points.length > 0) {
      const bounds = L.latLngBounds(points as LatLngExpression[])
      fitRef.current.fitBounds(bounds, { padding: [30, 30] })
    }
  }, [points.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-white/40">
          Haz clic en el mapa para marcar el recorrido · {points.length} punto{points.length === 1 ? '' : 's'}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={removeLast}
            disabled={points.length === 0}
            className={cn('p-1 rounded-md transition-colors', points.length ? 'text-white/50 hover:bg-white/10' : 'text-white/20 cursor-not-allowed')}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={points.length === 0}
            className={cn('p-1 rounded-md transition-colors', points.length ? 'text-red-400 hover:bg-red-500/10' : 'text-white/20 cursor-not-allowed')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div style={{ height }} className="rounded-xl overflow-hidden border border-white/10 relative z-0">
        <MapContainer
          center={RUNNING_START}
          zoom={13}
          scrollWheelZoom
          ref={fitRef}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickCatcher onAdd={addPoint} />
          {points.length > 0 && (
            <Polyline
              positions={points as LatLngExpression[]}
              pathOptions={{ color: '#C8FF00', weight: 4, opacity: 0.9 }}
            />
          )}
          {points.map((p, i) => (
            <Marker key={i} position={p} icon={DefaultIcon} />
          ))}
        </MapContainer>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-white/30">
        <MapPin className="w-3 h-3" />
        <span>El atleta verá este recorrido en el mapa de su app para seguirlo.</span>
      </div>
    </div>
  )
}

