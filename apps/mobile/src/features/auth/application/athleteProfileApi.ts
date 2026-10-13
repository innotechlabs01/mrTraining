/**
 * athleteProfileApi — single source of truth for athlete profile WRITES.
 *
 * The Go API defines both PUT endpoints as FULL REPLACE:
 *   - PUT /users/me    → { name, avatar_url }
 *   - PUT /athletes/me → { sport, experience_level, height_cm, weight_kg,
 *                          emergency_contact, emergency_phone, modality,
 *                          schedule_days, schedule_time } (snake_case)
 *
 * Sending a partial diff would WIPE every field the client omitted, so every
 * athlete-section write performs a mandatory READ-MODIFY-WRITE: read the RAW
 * `athlete_profile` object (from the `['athlete-profile']` cache, or GET when
 * cold), merge the patch, and send the full profile back.
 *
 * Routing note: writes go straight to the Go paths (`/users/me`, `/athletes/me`),
 * which `toGoApiPath` passes through as-is. The mobile path `/athlete/profile`
 * stays READ-ONLY (GET). No method-aware router.
 */
import type { QueryClient } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../infrastructure/api/client';

export const ATHLETE_PROFILE_QUERY_KEY = ['athlete-profile'] as const;

/**
 * Raw athlete_profile shape as returned by the Go API. Mirrors
 * `dto.AthleteProfileResponse`. The existing `AthleteProfile` type does NOT
 * declare these fields, so writes must NOT depend on it.
 */
export type AthleteProfileRaw = {
  name: string;
  email: string;
  avatar_url: string;
  sport: string;
  experience_level: string;
  height_cm: number;
  weight_kg: number;
  emergency_contact: string;
  emergency_phone: string;
  modality: string;
  schedule_days: string;
  schedule_time: string;
};

/** Fields owned by `PUT /athletes/me` (everything except identity/avatar). */
export type AthleteSectionPatch = Partial<
  Pick<
    AthleteProfileRaw,
    | 'sport'
    | 'experience_level'
    | 'height_cm'
    | 'weight_kg'
    | 'emergency_contact'
    | 'emergency_phone'
    | 'modality'
    | 'schedule_days'
    | 'schedule_time'
  >
>;

export type UserNamePayload = { name: string; avatar_url: string };

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}

function asNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Coerce an unknown value (cache entry / response body) into a raw profile.
 * Returns null when the value is not a plain object.
 */
export function toAthleteProfileRaw(source: unknown): AthleteProfileRaw | null {
  if (source === null || typeof source !== 'object' || Array.isArray(source)) return null;
  const s = source as Record<string, unknown>;
  return {
    name: asString(s.name),
    email: asString(s.email),
    avatar_url: asString(s.avatar_url),
    sport: asString(s.sport),
    experience_level: asString(s.experience_level),
    height_cm: asNumber(s.height_cm),
    weight_kg: asNumber(s.weight_kg),
    emergency_contact: asString(s.emergency_contact),
    emergency_phone: asString(s.emergency_phone),
    modality: asString(s.modality),
    schedule_days: asString(s.schedule_days),
    schedule_time: asString(s.schedule_time),
  };
}

/** Build the `PUT /users/me` payload — full replace of name + avatar. */
export function buildUserNamePayload(
  firstName: string,
  lastName: string,
  avatarUrl: string | null | undefined,
): UserNamePayload {
  return {
    name: `${asString(firstName)} ${asString(lastName)}`.trim(),
    avatar_url: asString(avatarUrl),
  };
}

/**
 * Merge a section patch over the raw profile. Sending the full object keeps the
 * Go full-replace from wiping the fields the user did not edit.
 */
export function buildAthleteSectionPayload(
  base: AthleteProfileRaw,
  patch: AthleteSectionPatch,
): AthleteProfileRaw {
  return { ...base, ...patch };
}

async function fetchRawProfile(): Promise<AthleteProfileRaw | null> {
  const { data } = await apiClient.get('/athlete/profile');
  // The Go endpoint always wraps the profile in an envelope. Require one of the
  // known keys so a malformed/empty response can never be mistaken for a profile
  // (which would send all-empty values and wipe the real data).
  if (data === null || typeof data !== 'object') return null;
  const envelope = data as Record<string, unknown>;
  const candidate = envelope.athlete_profile ?? envelope.profile ?? envelope.user ?? null;
  return toAthleteProfileRaw(candidate);
}

async function readRawProfile(queryClient: QueryClient): Promise<AthleteProfileRaw | null> {
  const fromCache = toAthleteProfileRaw(queryClient.getQueryData(ATHLETE_PROFILE_QUERY_KEY));
  if (fromCache) return fromCache;
  return fetchRawProfile();
}

/** `PUT /users/me` — identity update. Clerk is the source of truth for name. */
export async function updateUserName(
  queryClient: QueryClient,
  input: { firstName: string; lastName: string },
): Promise<void> {
  const raw = await readRawProfile(queryClient);
  // Fail-safe: never PUT a blank avatar we could not read.
  const payload = buildUserNamePayload(input.firstName, input.lastName, raw?.avatar_url ?? '');
  await apiClient.put('/users/me', payload);
}

/** `PUT /athletes/me` — read-modify-write so partial saves never wipe fields. */
export async function updateAthleteSection(
  queryClient: QueryClient,
  patch: AthleteSectionPatch,
): Promise<void> {
  const raw = await readRawProfile(queryClient);
  if (!raw) {
    throw new Error('No se pudo leer tu perfil. Intentá de nuevo.');
  }
  await apiClient.put('/athletes/me', buildAthleteSectionPayload(raw, patch));
}

type HttpErrorLike = {
  response?: { status?: number; data?: { error?: { message?: string } } };
};

function httpStatus(err: unknown): number | undefined {
  const status = (err as HttpErrorLike | null | undefined)?.response?.status;
  return typeof status === 'number' ? status : undefined;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'el nombre',
  avatar_url: 'la foto de perfil',
  sport: 'el deporte',
  experience_level: 'el nivel',
  height_cm: 'la altura',
  weight_kg: 'el peso',
  emergency_contact: 'el contacto de emergencia',
  emergency_phone: 'el teléfono de emergencia',
  modality: 'la modalidad',
  schedule_days: 'los días',
  schedule_time: 'el horario',
};

function validationFields(err: unknown): string[] {
  const message = (err as HttpErrorLike | null | undefined)?.response?.data?.error?.message;
  if (typeof message !== 'string' || !message.trim()) return [];
  return message
    .split(';')
    .map((part) => part.split(':')[0]?.trim() ?? '')
    .filter((field) => field.length > 0);
}

/**
 * Map an API error to a human, user-facing message. A 422 is surfaced per-field
 * when a single field is implicated, otherwise as a single generic prompt.
 */
export function profileErrorMessage(err: unknown, fallback: string): string {
  const status = httpStatus(err);
  if (status === 422) {
    const fields = validationFields(err);
    if (fields.length === 1) {
      const label = FIELD_LABELS[fields[0]];
      return label ? `Revisá ${label}` : 'Revisá los datos ingresados';
    }
    return 'Revisá los datos ingresados';
  }
  if (status === 404) return 'No se encontró tu perfil. Contactá a soporte.';
  if (status === 401) return 'Tu sesión expiró. Volvé a iniciar sesión.';
  if (status !== undefined && status >= 500) {
    return 'Hubo un problema en el servidor. Intentá de nuevo.';
  }
  if (status !== undefined) return fallback;
  // Non-HTTP errors carry their own message (e.g. profile read failure).
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}
