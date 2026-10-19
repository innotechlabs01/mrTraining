'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MapPin, Pause, Play, Square, AlertTriangle } from 'lucide-react'
import polyline from '@mapbox/polyline'
import {
  logRunningSession,
  logGpsBatch,
  updateRunningSession,
} from '@/features/shared/api/client'
import { formatDistance, formatDuration } from '../utils/format'

const BATCH_INTERVAL_MS = 15_000
const IDLE_PAUSE_MS = 90_000
const MAX_QUEUE = 500

interface RawPoint {
  lat: number
  lng: number
  alt?: number
  timestamp: string
  accuracy?: number
}

type TrackerState = 'idle' | 'recording' | 'paused' | 'saving'

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Web live-run tracker: watchPosition → local queue → batched POST every 15s
 * (or 20m traveled), pause after 90s without movement, finish closes the run
 * with totals + encoded polyline (plan v2 §1.3, §1E).
 */
export function LiveRunTracker({ onFinished }: { onFinished?: () => void }) {
  const [state, setState] = useState<TrackerState>('idle')
  const [distanceM, setDistanceM] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [gpsError, setGpsError] = useState<string | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const queueRef = useRef<RawPoint[]>([])
  const unsentRef = useRef<RawPoint[]>([])
  const lastPointRef = useRef<{ lat: number; lng: number } | null>(null)
  const lastMoveRef = useRef<number>(Date.now())
  const pausedRef = useRef(false)
  const startedAtRef = useRef<number>(0)
  const resumedMsRef = useRef<number>(0)
  const resumeAtRef = useRef<number>(0)
  const batchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const distanceRef = useRef(0)

  // Flush queue to API. Retries are the client's buffer: on failure points stay
  // queued (capped) and the next tick retries them.
  const flush = useCallback(async () => {
    const points = [...unsentRef.current]
    if (points.length === 0 || !sessionIdRef.current) return
    // Cap per request at 100 (server rule).
    const chunk = points.slice(0, 100)
    try {
      await logGpsBatch(sessionIdRef.current, chunk)
      unsentRef.current = points.slice(chunk.length)
    } catch {
      // keep points queued for the next tick; localStorage backup below
      try {
        localStorage.setItem(
          `running:pending:${sessionIdRef.current}`,
          JSON.stringify(unsentRef.current.slice(-MAX_QUEUE))
        )
      } catch {
        /* storage full — drop */
      }
    }
  }, [])

  const startWatch = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Tu navegador no soporta geolocalización')
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(null)
        if (pausedRef.current) return
        const point: RawPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          alt: pos.coords.altitude ?? undefined,
          timestamp: new Date(pos.timestamp).toISOString(),
          accuracy: pos.coords.accuracy,
        }
        // Client-side accuracy filter (server drops >50m too).
        if ((point.accuracy ?? 0) > 30) return

        const prev = lastPointRef.current
        if (prev) {
          const d = haversineMeters(prev, point)
          // Ignore sub-meter jitter while "moving".
          if (d < 1) {
            // No movement — start idle countdown.
            return
          }
          distanceRef.current += d
          setDistanceM(distanceRef.current)
        }
        lastPointRef.current = { lat: point.lat, lng: point.lng }
        lastMoveRef.current = Date.now()
        queueRef.current.push(point)
        unsentRef.current.push(point)
        // Flush early every 20m of travel.
        if (unsentRef.current.length >= 40) void flush()
      },
      (err) => {
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado — activá el permiso para grabar'
            : 'Señal GPS débil o no disponible'
        )
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }, [flush])

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const handleStart = useCallback(async () => {
    setGpsError(null)
    try {
      const session = await logRunningSession({
        date: new Date().toISOString().slice(0, 10),
        distance: 0,
        duration: 0,
        source: 'web_gps',
      })
      sessionIdRef.current = session.id
    } catch {
      setGpsError('No se pudo crear la sesión — revisá tu conexión')
      return
    }
    distanceRef.current = 0
    setDistanceM(0)
    setElapsedMs(0)
    queueRef.current = []
    unsentRef.current = []
    lastPointRef.current = null
    lastMoveRef.current = Date.now()
    pausedRef.current = false
    startedAtRef.current = Date.now()
    resumedMsRef.current = 0
    setState('recording')
    startWatch()
    batchTimerRef.current = setInterval(() => void flush(), BATCH_INTERVAL_MS)
    tickRef.current = setInterval(() => {
      if (pausedRef.current) return
      setElapsedMs(Date.now() - startedAtRef.current - resumedMsRef.current)
      // Auto-pause after 90s without movement.
      if (Date.now() - lastMoveRef.current > IDLE_PAUSE_MS) {
        pausedRef.current = true
        resumeAtRef.current = Date.now()
        setState('paused')
      }
    }, 1000)
  }, [flush, startWatch])

  const handlePauseResume = useCallback(() => {
    if (state === 'recording') {
      pausedRef.current = true
      resumeAtRef.current = Date.now()
      setState('paused')
      stopWatch()
    } else if (state === 'paused') {
      resumedMsRef.current += Date.now() - resumeAtRef.current
      pausedRef.current = false
      setState('recording')
      startWatch()
    }
  }, [state, startWatch, stopWatch])

  const handleFinish = useCallback(async () => {
    if (!sessionIdRef.current) return
    setState('saving')
    stopWatch()
    if (batchTimerRef.current) clearInterval(batchTimerRef.current)
    if (tickRef.current) clearInterval(tickRef.current)

    // Last flush + polyline from everything we captured this session.
    await flush()
    const all = [...unsentRef.current, ...queueRef.current]
    const coords = all.map((p) => [p.lat, p.lng] as [number, number])
    const route = coords.length >= 2 ? polyline.encode(coords) : ''
    const durationSec = Math.max(
      1,
      Math.round(
        (Date.now() - startedAtRef.current - resumedMsRef.current) / 1000
      )
    )
    const distanceKm = distanceRef.current / 1000

    try {
      await updateRunningSession(sessionIdRef.current, {
        distance: Number(distanceKm.toFixed(3)),
        duration: durationSec,
        gps_route: route,
      })
      try {
        localStorage.removeItem(`running:pending:${sessionIdRef.current}`)
      } catch {
        /* noop */
      }
      sessionIdRef.current = null
      setState('idle')
      onFinished?.()
    } catch {
      setGpsError('No se pudo guardar la carrera — los datos quedaron en tu navegador')
      setState('paused')
    }
  }, [flush, onFinished, stopWatch])

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      stopWatch()
      if (batchTimerRef.current) clearInterval(batchTimerRef.current)
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [stopWatch])

  const pace =
    distanceM > 0 && elapsedMs > 0
      ? formatDuration(Math.round(elapsedMs / 1000 / (distanceM / 1000)))
      : '—'

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${
              state === 'recording'
                ? 'animate-pulse bg-red-500'
                : state === 'paused'
                  ? 'bg-amber-400'
                  : 'bg-white/20'
            }`}
          />
          <span className="text-sm font-medium text-white">
            {state === 'recording'
              ? 'Grabando'
              : state === 'paused'
                ? 'En pausa'
                : state === 'saving'
                  ? 'Guardando…'
                  : 'Listo para grabar'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {state === 'idle' && (
            <button
              onClick={() => void handleStart()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <MapPin size={14} /> Grabar carrera
            </button>
          )}
          {(state === 'recording' || state === 'paused') && (
            <>
              <button
                onClick={handlePauseResume}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/5"
              >
                {state === 'recording' ? <Pause size={14} /> : <Play size={14} />}
                {state === 'recording' ? 'Pausar' : 'Reanudar'}
              </button>
              <button
                onClick={() => void handleFinish()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Square size={14} /> Finalizar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Métricas en vivo */}
      {(state === 'recording' || state === 'paused') && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-white/40">Distancia</p>
            <p className="text-lg font-semibold text-white">
              {formatDistance(distanceM / 1000)}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/40">Tiempo</p>
            <p className="text-lg font-semibold text-white">
              {formatDuration(Math.round(elapsedMs / 1000))}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/40">Ritmo</p>
            <p className="text-lg font-semibold text-white">{pace} min/km</p>
          </div>
        </div>
      )}

      {gpsError && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          <AlertTriangle size={12} /> {gpsError}
        </div>
      )}

      <p className="mt-3 text-[11px] text-white/30">
        Mantené esta pestaña abierta durante la carrera. La ubicación se envía
        cada 15 segundos; sin movimiento por 90 segundos la grabación se pausa
        sola.
      </p>
    </div>
  )
}
