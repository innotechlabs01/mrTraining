/** Formatting helpers for running metrics (pace, duration, distance, dates). */

/** Seconds → "45:30" (mm:ss) or "1:05:30" (h:mm:ss). */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** km with 2 decimals, e.g. 10.42 → "10.42 km". */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km)) return '0.00 km'
  return `${km.toFixed(2)} km`
}

/** Pace string "5:30" already comes from the API; guard empties. */
export function formatPace(pace: string | undefined): string {
  return pace && pace !== '0:00' ? `${pace} min/km` : '—'
}

/** "2026-10-18" → "18 oct" (es-AR short month). */
export function formatSessionDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

/** Source badge label. */
export function sourceLabel(source: string): string {
  switch (source) {
    case 'garmin':
      return 'Garmin'
    case 'apple_watch':
      return 'Apple Watch'
    case 'healthkit':
      return 'HealthKit'
    case 'mobile_gps':
      return 'GPS móvil'
    case 'web_gps':
      return 'GPS web'
    default:
      return 'Manual'
  }
}
