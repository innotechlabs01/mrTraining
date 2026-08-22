// Importers for workout CSVs exported by popular trackers (Strong, Hevy, FitNotes).
//
// Each exporter uses different column headers; we normalize to one row shape and then match
// exercise names against the library. Anything unmatched becomes a candidate custom exercise
// upstream — nothing in the file is silently dropped.
//
// Clean-room implementation; header aliases documented inline.

import type { ExerciseMode } from './types'

export interface ParsedSetRow {
  date: string // YYYY-MM-DD
  workoutName: string
  exerciseName: string
  setIndex: number // 1-based within the (date, exercise) group
  weightKg: number | null
  reps: number | null
  sec: number | null
  minutes: number | null
  rpe: number | null
}

type HeaderAliases = Partial<Record<keyof ParsedSetRow | 'weight' | 'reps' | 'seconds' | 'distance' | 'time' | 'exercise', string>>

const HEADER_ALIASES: Record<string, string[]> = {
  date: ['date', 'workout date', 'fecha'],
  workoutName: ['workout name', 'workout', 'routine name', 'title'],
  exerciseName: ['exercise name', 'exercise', 'ejercicio'],
  setIndex: ['set order', 'set index', 'set #', 'set'],
  weightKg: ['weight', 'weight (kg)', 'weight kg', 'peso'],
  reps: ['reps', 'repetitions', 'repeticiones'],
  sec: ['seconds', 'secs', 'duration', 'time'],
  rpe: ['rpe', 'rpe (scale)'],
}

/** Split a single CSV line honoring quoted fields. */
function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ } else { inQuotes = !inQuotes }
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map(s => s.trim())
}

function detectDelimiter(headerLine: string): string {
  const commas = (headerLine.match(/,/g) ?? []).length
  const semis = (headerLine.match(/;/g) ?? []).length
  return semis > commas ? ';' : ','
}

function normalizeHeaderKey(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ')
}

function resolveColumns(headerCells: string[]): Record<string, number> {
  const col: Record<string, number> = {}
  headerCells.forEach((raw, i) => {
    const key = normalizeHeaderKey(raw)
    for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(key) && col[canonical] === undefined) col[canonical] = i
    }
  })
  return col
}

const numOrNull = (v: string | undefined): number | null => {
  if (v == null || v === '') return null
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Normalize a date cell to YYYY-MM-DD where possible; otherwise pass through. */
function normalizeDateCell(v: string): string {
  const trimmed = v.trim()
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch) return isoMatch[1]
  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return trimmed
}

/**
 * Parse a tracker CSV into normalized set rows. Throws when required columns
 * (date + exercise) are missing so callers can surface a clear import error.
 */
export function parseWorkoutCsv(csv: string): ParsedSetRow[] {
  const lines = csv.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length < 2) throw new Error('CSV is empty')
  const delimiter = detectDelimiter(lines[0])
  const headerCells = splitCsvLine(lines[0], delimiter)
  const col = resolveColumns(headerCells)
  if (col.date === undefined || col.exerciseName === undefined) {
    throw new Error('CSV missing required columns: date and exercise name')
  }

  const rows: ParsedSetRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i], delimiter)
    const get = (key: string) => (col[key] !== undefined ? cells[col[key]] : undefined)
    const sec = numOrNull(get('sec'))
    const minutes = sec != null && sec >= 60 && (get('sec')?.toLowerCase().includes('min') ?? false) ? sec / 60 : null
    rows.push({
      date: normalizeDateCell(get('date') ?? ''),
      workoutName: get('workoutName') ?? '',
      exerciseName: (get('exerciseName') ?? '').trim(),
      setIndex: numOrNull(get('setIndex')) ?? rows.filter(r => r.exerciseName === (get('exerciseName') ?? '').trim()).length + 1,
      weightKg: numOrNull(get('weightKg')),
      reps: numOrNull(get('reps')),
      sec,
      minutes,
      rpe: numOrNull(get('rpe')),
    })
  }
  return rows
}

/** Lowercase alphanumerics only — the loose identity used for matching. */
export function normalizeExerciseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export interface LibraryLike { id: string; slug: string; name: string }

export interface MatchResult<T extends LibraryLike = LibraryLike> {
  /** Requested (normalized) name -> library item. */
  matched: Map<string, T>
  unmatched: string[]
}

/**
 * Match requested names against the library. Strategy: exact normalized equality, then
 * slug equality, then unique containment either way. Ambiguous contains-matches stay
 * unmatched rather than guessing.
 */
export function matchToLibrary<T extends LibraryLike>(names: string[], library: T[]): MatchResult<T> {
  const byNorm = new Map<string, T>()
  for (const item of library) {
    byNorm.set(normalizeExerciseName(item.name), item)
    byNorm.set(normalizeExerciseName(item.slug), item)
  }

  const matched = new Map<string, T>()
  const unmatched: string[] = []
  for (const raw of names) {
    const norm = normalizeExerciseName(raw)
    if (!norm) continue
    const exact = byNorm.get(norm)
    if (exact) { matched.set(norm, exact); continue }
    const containingIds = [...new Set([...byNorm.entries()]
      .filter(([k]) => k.includes(norm) || norm.includes(k))
      .map(([, v]) => v.id))]
    if (containingIds.length === 1) {
      matched.set(norm, [...byNorm.values()].find(v => v.id === containingIds[0])!)
    } else {
      unmatched.push(raw.trim())
    }
  }
  return { matched, unmatched: [...new Set(unmatched)] }
}

/** Infer the logging mode of an imported exercise row group. */
export function inferMode(rows: ParsedSetRow[]): ExerciseMode {
  const withReps = rows.some(r => r.reps != null && r.weightKg != null)
  const withSec = rows.some(r => r.sec != null || r.minutes != null)
  if (withReps) return 'reps'
  if (withSec) return 'time'
  return 'reps'
}
