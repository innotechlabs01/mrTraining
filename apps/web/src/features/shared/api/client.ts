/**
 * API Client — Routes requests to Go backend (primary) or Next.js (fallback).
 *
 * Go API Endpoints (primary source):
 *   - /api/v1/users/me          — User profile
 *   - /api/v1/coaches           — Coach list, athletes by coach
 *   - /api/v1/athletes/me       — Athlete profile
 *   - /api/v1/exercises         — Exercise library
 *   - /api/v1/workout-templates — Workout templates
 *   - /api/v1/workouts          — Assigned workouts, workout sets
 *   - /api/v1/progress          — Athlete progress
 *   - /api/v1/memberships       — Memberships and payments
 *   - /api/v1/events            — Events and registrations
 *   - /api/v1/products          — Products and sales
 *   - /api/v1/devices           — Push notification devices
 *   - /api/v1/notifications     — User notifications
 *   - /api/v1/running           — Running sessions and stats
 *
 * Next.js API Routes (fallback for endpoints not in Go):
 *   - /api/coaching/*           — Coaching dashboard (time-blocks, athletes, sessions, messages, etc.)
 *   - /api/coach/*              — Coach-specific (profile, workout-templates, video-analytics, etc.)
 *   - /api/athlete/*            — Athlete-specific (workouts, sessions, health, favorites, etc.)
 *   - /api/progress/*           — Progress analytics
 *   - /api/marketing/*          — Marketing (blog, products, plans)
 */
import { CircuitBreakerOpenError, GoApiError, goClient, goFetch, goFetchBlob } from '@/lib/api/go-client'

export function shouldFallbackToNextApi(err: unknown, method = 'GET'): boolean {
  if (err instanceof CircuitBreakerOpenError) {
    return false;
  }
  const normalized = method.toUpperCase();
  if (normalized !== 'GET' && normalized !== 'HEAD') {
    return false;
  }
  return err instanceof GoApiError && (err.status === 404 || err.status === 501);
}
import type { CoachEvent } from '@/features/coach/types'
import type { CoachLandingResponse } from '@/features/coach/types'
import type { EarningsSummary } from '@/features/coach/types'
import type { Plan } from '@/features/coach/types'
import type { Product } from '@/features/coach/types'
import type { Sale } from '@/features/coach/types'
import type { LandingData } from '@/components/landing/data'
import type { PaymentAvailability } from '@/features/shared/types/paymentAvailability'

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Go API base URL (same as go-client.ts, used for health checks)
const GO_API_BASE = process.env.NEXT_PUBLIC_GO_API_URL || ''

// Legacy API base (kept for backwards-compat only)
// @deprecated LEGACY_API_BASE is kept only for backwards-compat of the legacy `api` helper.
// New code must use `goFetch` (Go backend) or `nextRequest` (Next.js routes).
const LEGACY_API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

interface ClerkWindow {
  Clerk?: {
    session?: {
      getToken: () => Promise<string | null>;
    };
  };
}

async function getAuthHeaders(headers?: HeadersInit): Promise<Record<string, string>> {
  const headerObj: Record<string, string> = { 'Content-Type': 'application/json' };
  if (headers) Object.entries(headers).forEach(([k, v]) => { headerObj[k] = v as string; });
  if (typeof window !== 'undefined') {
    let token: string | null = null;
    const clerk = (window as unknown as ClerkWindow).Clerk;
    if (clerk?.session?.getToken) try { token = await clerk.session.getToken(); } catch {}
    // Security: JWTs are never read from localStorage (XSS risk). Clerk session only.
    if (token) headerObj['Authorization'] = `Bearer ${token}`;
  }
  return headerObj;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const headerObj = auth ? await getAuthHeaders(headers) : { 'Content-Type': 'application/json', ...(headers as Record<string, string> || {}) };

  const response = await fetch(`${LEGACY_API_BASE}${endpoint}`, {
    ...rest,
    headers: headerObj,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/** @deprecated Legacy Go helper — hits `${LEGACY_API_BASE}` (same-origin when env is empty). Prefer `nextRequest`. */
export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, data: unknown, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: unknown, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(endpoint: string, data: unknown, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'DELETE' }),
};

// ---- Same-origin Next.js request helper (used by all Next.js routes) ----
async function nextRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const headerObj = auth ? await getAuthHeaders(headers) : { 'Content-Type': 'application/json', ...(headers as Record<string, string> || {}) };
  const response = await fetch(endpoint, { ...rest, headers: headerObj });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

const nextFetch = {
  get: <T>(endpoint: string, options?: RequestOptions) => nextRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, data: unknown, options?: RequestOptions) => nextRequest<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: unknown, options?: RequestOptions) => nextRequest<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(endpoint: string, data: unknown, options?: RequestOptions) => nextRequest<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string, options?: RequestOptions) => nextRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

// Workout API
export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  section: string;
  sets: WorkoutSet[];
  focus?: string;
  estimatedDuration?: number;
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  setType: string;
  prescribedReps: number | null;
  prescribedWeight: number | null;
  prescribedRPE: number | null;
  actualReps: number | null;
  actualWeight: number | null;
  isCompleted: boolean;
  isSkipped: boolean;
  completedAt: string | null;
  notes: string;
}

export interface Workout {
  id: string;
  name: string;
  description: string;
  sportType: string;
  status: string;
  scheduledDate: string;
  coachNote: string;
  exercises: WorkoutExercise[];
  focus?: string;
  estimatedDuration?: number;
}

// Workout API — Go backend (primary) with Next.js fallback.
// Go endpoints: /api/v1/workouts, /api/v1/workouts/assign, /api/v1/workouts/:id/sets
// Next.js fallback: /api/coaching/assigned-workouts, /api/athlete/workouts, /api/athlete/today
export const workoutApi = {
  create: (data: { name: string; description: string; sportType: string; scheduledDate: string; athleteId: string; programId?: string; exercises?: unknown[]; templateId?: string; modality?: string; startDate?: string; endDate?: string; daysOfWeek?: number[] }) =>
    // Go API: POST /api/v1/workouts/assign (assigns a template; copies its exercises)
    goFetch<Workout>('/api/v1/workouts/assign', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        athleteId: data.athleteId,
        templateId: data.templateId,
        modality: data.modality,
        startDate: data.startDate,
        endDate: data.endDate,
        daysOfWeek: data.daysOfWeek,
      }),
    }),

  getById: (id: string) =>
    // Go API: GET /api/v1/workouts/:id (if not implemented, fallback)
    goFetch<Workout>(`/api/v1/workouts/${id}`).catch((err) => {
      if (!shouldFallbackToNextApi(err, 'GET')) throw err;
      return nextFetch.get<Workout>(`/api/coaching/assigned-workouts/${id}`);
    }),

  complete: (id: string, data: { rpe: number; notes: string }) =>
    // Go API: POST /api/v1/workouts/:id/sets (log completion) — no mutation fallback
    goFetch<Workout>(`/api/v1/workouts/${id}/sets`, {
      method: 'POST',
      body: JSON.stringify({ rpe: data.rpe, notes: data.notes, completed: true }),
    }),

  getAthleteWorkouts: (athleteId: string, dateFrom?: string, dateTo?: string) => {
    // Go API: GET /api/v1/workouts
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    const qs = params.toString();
    void athleteId; // Go API uses auth-derived athlete
    return goFetch<{ data: Workout[] }>(`/api/v1/workouts${qs ? `?${qs}` : ''}`).then(r => r.data).catch((err) => {
      if (!shouldFallbackToNextApi(err, 'GET')) throw err;
      return nextFetch.get<Workout[]>(`/api/athlete/workouts${qs ? `?${qs}` : ''}`);
    });
  },

  getTodayWorkout: (_athleteId: string) =>
    // Next.js: /api/athlete/today (not in Go API)
    nextFetch.get<Workout>('/api/athlete/today'),

  getPendingReviews: () =>
    // Go API: GET /api/v1/workouts (coach view)
    goFetch<{ data: Workout[] }>('/api/v1/workouts').then(r => r.data).catch((err) => {
      if (!shouldFallbackToNextApi(err, 'GET')) throw err;
      return nextFetch.get<Workout[]>('/api/coaching/assigned-workouts');
    }),
};

// Coach API
export interface CoachProfile {
  id: string;
  userId: string;
  coach_code?: string;
  coachCode?: string;
  specializations: string[];
  certifications: string[];
  certLevel: string;
  bio: string;
  experienceYears: number;
  websiteUrl: string;
  instagramHandle: string;
  youtubeHandle: string;
  athleteCount: number;
  maxAthletes: number;
  isVerified: boolean;
  status: string;
}

// Go API response for /api/v1/users/me
interface CurrentUserResponse {
  user: unknown;
  coach?: CoachProfile;
  athlete_profile?: unknown;
}

// Coach API — Go backend (PRIMARY — no Next.js fallback per architecture)
// Go endpoints: /api/v1/users/me, /api/v1/coaches/me
export const coachApi = {
  getProfile: () =>
    // Go API: GET /api/v1/users/me (returns { user, coach?, athlete_profile? })
    goFetch<CurrentUserResponse>('/api/v1/users/me')
      .then((res) => res.coach),

  updateProfile: (data: Partial<CoachProfile>) =>
    // Go API: PUT /api/v1/coaches/me
    goFetch<CoachProfile>('/api/v1/coaches/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Coach view of athlete's running data
  getAthleteRunningSessions: (
    athleteId: string,
    params: { page?: number; limit?: number; fromDate?: string; toDate?: string } = {}
  ) =>
    goFetch<{ data: Array<RunningSession & Record<string, unknown>>; total: number; page: number; limit: number }>(
      `/api/v1/coach/athletes/${athleteId}/running/sessions${buildQuery({
        page: params.page,
        limit: params.limit,
        from_date: params.fromDate,
        to_date: params.toDate,
      })}`
    ).then((res) => ({
      ...res,
      data: (res.data ?? []).map((s) => ({
        ...s,
        heartRate: Number(s.heartRate ?? s.heart_rate ?? 0),
        gpsRoute: (s.gpsRoute ?? s.gps_route ?? undefined) as string | undefined,
        deviceName: (s.deviceName ?? s.device_name ?? undefined) as string | undefined,
        deviceBrand: (s.deviceBrand ?? s.device_brand ?? undefined) as string | undefined,
        createdAt: String(s.createdAt ?? s.created_at ?? ''),
      })),
    })),

  getAthleteRunningSessionDetail: (athleteId: string, sessionId: string) =>
    goFetch<Record<string, unknown>>(
      `/api/v1/coach/athletes/${athleteId}/running/sessions/${sessionId}`
    ).then((raw) => {
      const gpsPoints = Array.isArray(raw.gpsPoints ?? raw.gps_points)
        ? ((raw.gpsPoints ?? raw.gps_points) as Array<Record<string, unknown>>).map((p) => ({
            id: String(p.id ?? ''),
            sessionId: String(p.sessionId ?? p.session_id ?? sessionId),
            lat: Number(p.lat ?? 0),
            lng: Number(p.lng ?? 0),
            alt: p.alt != null ? Number(p.alt) : undefined,
            timestamp: String(p.timestamp ?? ''),
            accuracy: p.accuracy != null ? Number(p.accuracy) : undefined,
          }))
        : []
      const sessionObj = (raw.session as Record<string, unknown> | undefined) ?? raw
      const session: RunningSession = {
        id: String(sessionObj.id ?? sessionId),
        date: String(sessionObj.date ?? ''),
        distance: Number(sessionObj.distance ?? 0),
        duration: Number(sessionObj.duration ?? 0),
        pace: String(sessionObj.pace ?? ''),
        speed: Number(sessionObj.speed ?? 0),
        calories: Number(sessionObj.calories ?? 0),
        elevation: Number(sessionObj.elevation ?? 0),
        heartRate: Number(sessionObj.heartRate ?? sessionObj.heart_rate ?? 0),
        cadence: Number(sessionObj.cadence ?? 0),
        gpsRoute: (sessionObj.gpsRoute ?? sessionObj.gps_route ?? undefined) as string | undefined,
        source: String(sessionObj.source ?? 'manual'),
        createdAt: String(sessionObj.createdAt ?? sessionObj.created_at ?? ''),
      }
      return { session, gpsPoints } as RunningSessionDetail
    }),

  getAthleteRunningStats: (athleteId: string, fromDate?: string, toDate?: string) =>
    goFetch<Record<string, unknown>>(
      `/api/v1/coach/athletes/${athleteId}/running/stats${buildQuery({ from_date: fromDate, to_date: toDate })}`
    ).then((r): RunningStats => ({
      totalSessions: Number(r.totalSessions ?? r.total_sessions ?? 0),
      totalDistance: Number(r.totalDistance ?? r.total_distance ?? 0),
      totalDuration: Number(r.totalDuration ?? r.total_duration ?? 0),
      totalCalories: Number(r.totalCalories ?? r.total_calories ?? 0),
      totalElevation: Number(r.totalElevation ?? r.total_elevation ?? 0),
      avgDistance: Number(r.avgDistance ?? r.avg_distance ?? 0),
      avgDuration: Number(r.avgDuration ?? r.avg_duration ?? 0),
      avgCalories: Number(r.avgCalories ?? r.avg_calories ?? 0),
      avgHeartRate: Number(r.avgHeartRate ?? r.avg_heart_rate ?? 0),
      avgPace: String(r.avgPace ?? r.avg_pace ?? ''),
    })),

  getAthleteRunningPRs: (athleteId: string) =>
    goFetch<RunningPRsResponse>(`/api/v1/coach/athletes/${athleteId}/running/prs`),

  getAthleteRunningWeeklyTrend: (athleteId: string, fromDate?: string, toDate?: string) =>
    goFetch<Array<Record<string, unknown>>>(
      `/api/v1/coach/athletes/${athleteId}/running/weekly-trend${buildQuery({ from_date: fromDate, to_date: toDate })}`
    ).then((list) =>
      (Array.isArray(list) ? list : []).map((w): WeeklyTrendPoint => ({
        week: String(w.week ?? ''),
        distance: Number(w.distance ?? 0),
        sessions: Number(w.sessions ?? 0),
        avgPaceSec: Number(w.avgPaceSec ?? w.avg_pace_sec ?? 0),
        avgHeartRate: Number(w.avgHeartRate ?? w.avg_heart_rate ?? 0),
      }))
    ),

  getAthleteAssignedWorkouts: (athleteId: string) =>
    goFetch<{ data: PastAssignmentListItem[] } | PastAssignmentListItem[]>(
      `/api/v1/workouts?athleteId=${encodeURIComponent(athleteId)}`
    ).then((res) => (Array.isArray(res) ? res : res.data ?? [])),

  exportAthleteRunningSessions: (
    athleteId: string,
    format: 'csv' | 'gpx',
    fromDate?: string,
    toDate?: string
  ) =>
    goFetchBlob(
      `/api/v1/coach/athletes/${athleteId}/running/export${buildQuery({
        format,
        from_date: fromDate,
        to_date: toDate,
      })}`
    ),
};

// ---- Event contract mappers (Go API ↔ CoachEvent) ----
type GoFormField = {
  id: string;
  label: string;
  kind: string;
  options?: string[];
  required: boolean;
  sort_order: number;
};

type GoEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  end_time: string;
  type: string;
  modality: string;
  location: string;
  description: string;
  status: string;
  format?: string;
  is_public: boolean;
  max_capacity?: number | null;
  price_cents?: number;
  currency?: string;
  registration_deadline?: string;
  running_distance_km?: number | null;
  running_pace?: string;
  running_meeting_point?: string;
  running_categories?: string[];
  running_elevation_m?: number | null;
  running_route_url?: string;
  accepted_count?: number;
  athlete_ids: string[];
  form_fields?: GoFormField[];
  list_items?: string[];
  coach_id: string;
  created_at: string;
  updated_at: string;
};

// Go API speaks snake_case; web Product type speaks camelCase.
export type GoProduct = {
  id: string;
  name: string;
  brand?: string;
  image_url?: string;
  price: number;
  received: number;
  gross: number;
  stock: number;
  low_stock_threshold: number;
  description?: string;
  category?: string;
  is_shop?: boolean;
  created_at: string;
  updated_at?: string;
};

// Exported for server-side prefetch (see src/app/(app)/coach/page.tsx) — the
// RSC must apply the exact same mapping so hydrated data matches client shape.
export function mapGoProduct(g: GoProduct): Product {
  return {
    id: g.id,
    name: g.name,
    brand: g.brand,
    imageUrl: g.image_url,
    price: g.price,
    received: g.received,
    gross: g.gross,
    stock: g.stock,
    lowStockThreshold: g.low_stock_threshold,
    description: g.description,
    category: g.category,
    isShop: Boolean(g.is_shop),
    createdAt: g.created_at,
  };
}

export function toGoProduct(p: Partial<Product>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.name !== undefined) out.name = p.name;
  if (p.brand !== undefined) out.brand = p.brand;
  if (p.imageUrl !== undefined) out.image_url = p.imageUrl;
  if (p.price !== undefined) out.price = p.price;
  if (p.received !== undefined) out.received = p.received;
  if (p.gross !== undefined) out.gross = p.gross;
  if (p.stock !== undefined) out.stock = p.stock;
  if (p.lowStockThreshold !== undefined) out.low_stock_threshold = p.lowStockThreshold;
  if (p.description !== undefined) out.description = p.description;
  if (p.category !== undefined) out.category = p.category;
  if (p.isShop !== undefined) out.is_shop = p.isShop;
  return out;
}

// Go API plan shape (snake_case) and mapping to the web Plan type.
export type GoPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_period: string;
  max_athletes: number;
  max_sessions_per_week: number;
  is_active: boolean;
  athlete_count: number;
  coach_id: string;
  trm?: number;
  discount?: {
    type: string;
    value: number;
    label?: string;
    valid_from?: string;
    valid_until?: string;
    code?: string;
  } | null;
  created_at: string;
  updated_at: string;
};

export function mapGoPlan(g: GoPlan): Plan {
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    price: g.price,
    currency: g.currency === 'USD' ? 'USD' : 'COP',
    billingPeriod: (g.billing_period as Plan['billingPeriod']) ?? 'monthly',
    trainingMode: [],
    maxAthletes: g.max_athletes,
    maxSessionsPerWeek: g.max_sessions_per_week,
    features: [],
    isActive: g.is_active,
    athleteCount: g.athlete_count,
    trm: g.trm,
    discount: g.discount
      ? {
          type: g.discount.type as 'percentage' | 'fixed',
          value: g.discount.value,
          label: g.discount.label,
          validFrom: g.discount.valid_from,
          validUntil: g.discount.valid_until,
          code: g.discount.code,
        }
      : null,
  };
}

export function toGoPlan(p: Partial<Plan>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.name !== undefined) out.name = p.name;
  if (p.description !== undefined) out.description = p.description;
  if (p.price !== undefined) out.price = p.price;
  if (p.currency !== undefined) out.currency = p.currency;
  if (p.billingPeriod !== undefined) out.billing_period = p.billingPeriod;
  if (p.maxAthletes !== undefined) out.max_athletes = p.maxAthletes;
  if (p.maxSessionsPerWeek !== undefined) out.max_sessions_per_week = p.maxSessionsPerWeek;
  if (p.isActive !== undefined) out.is_active = p.isActive;
  if (p.trm !== undefined) out.trm = p.trm;
  if (p.discount !== undefined && p.discount) {
    out.discount_type = p.discount.type;
    out.discount_value = p.discount.value;
    out.discount_label = p.discount.label ?? '';
    out.discount_valid_from = p.discount.validFrom ?? '';
    out.discount_valid_until = p.discount.validUntil ?? '';
    out.discount_code = p.discount.code ?? '';
  } else if (p.discount === null) {
    out.discount_type = '';
    out.discount_value = 0;
    out.discount_label = '';
    out.discount_valid_from = '';
    out.discount_valid_until = '';
    out.discount_code = '';
  }
  return out;
}

// Support ticket types (snake_case from Go API)
export type SupportTicket = {
  id: string;
  ticket_number: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  coach_id: string;
  athlete_id?: string;
  assigned_to?: string;
  unread_count: number;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
};

export type TicketMessage = {
  id: string;
  ticket_id: string;
  author: string;
  author_id: string;
  body: string;
  image_url?: string;
  read_at?: string;
  created_at: string;
};

// Go API speaks snake_case for sales too; normalize to the web Sale type.
export type GoSale = {
  id: string;
  product_id: string;
  product_name: string;
  brand?: string;
  quantity: number;
  unit_price: number;
  unit_received: number;
  total: number;
  date: string;
  created_at: string;
};

export function mapGoSale(s: GoSale): Sale {
  return {
    id: s.id,
    productId: s.product_id,
    productName: s.product_name,
    brand: s.brand,
    quantity: s.quantity,
    unitPrice: s.unit_price,
    unitReceived: s.unit_received,
    total: s.total,
    date: s.date,
    createdAt: s.created_at,
  };
}

export function toGoSale(s: Omit<Sale, 'id' | 'createdAt'>): Record<string, unknown> {
  return {
    product_id: s.productId,
    product_name: s.productName,
    brand: s.brand,
    quantity: s.quantity,
    unit_price: s.unitPrice,
    unit_received: s.unitReceived,
    total: s.total,
    date: s.date,
  };
}

// Exported for server-side prefetch (see src/app/(app)/coach/page.tsx) — the
// RSC must apply the exact same mapping so hydrated data matches client shape.
export function mapGoEvent(g: GoEvent): CoachEvent {
  const hasRunning =
    g.running_distance_km != null ||
    !!g.running_pace ||
    !!g.running_meeting_point ||
    (Array.isArray(g.running_categories) && g.running_categories.length > 0) ||
    g.running_elevation_m != null ||
    !!g.running_route_url;
  return {
    id: g.id,
    title: g.title,
    date: g.date,
    time: g.time,
    endTime: g.end_time,
    type: g.type,
    modality: g.modality,
    location: g.location,
    description: g.description,
    status: g.status,
    format: g.format,
    maxCapacity: g.max_capacity ?? undefined,
    priceCents: g.price_cents ?? 0,
    currency: g.currency ?? 'COP',
    registrationDeadline: g.registration_deadline || undefined,
    acceptedCount: g.accepted_count ?? 0,
    athleteIds: g.athlete_ids ?? [],
    listItems: g.list_items ?? [],
    formFields: (g.form_fields ?? []).map((f) => ({
      id: f.id,
      label: f.label,
      kind: f.kind,
      options: f.options ?? [],
      required: f.required,
    })),
    running: hasRunning
      ? {
          distanceKm: g.running_distance_km ?? undefined,
          pace: g.running_pace,
          meetingPoint: g.running_meeting_point,
          categories: g.running_categories ?? [],
          elevationM: g.running_elevation_m ?? undefined,
          routeUrl: g.running_route_url || undefined,
        }
      : undefined,
    public: g.is_public,
  } as CoachEvent;
}

function toGoEvent(e: CoachEvent): Record<string, unknown> {
  return {
    title: e.title,
    date: e.date,
    time: e.time,
    end_time: e.endTime,
    type: e.type,
    modality: e.modality,
    location: e.location,
    description: e.description,
    status: e.status,
    format: e.format,
    is_public: !!e.public,
    max_capacity: e.maxCapacity ?? null,
    price_cents: e.priceCents ?? 0,
    currency: e.currency ?? 'COP',
    registration_deadline: e.registrationDeadline ?? '',
    athlete_ids: e.athleteIds ?? [],
    list_items: e.listItems ?? [],
    form_fields: (e.formFields ?? []).map((f) => ({
      id: f.id,
      label: f.label,
      kind: f.kind,
      options: f.options ?? [],
      required: !!f.required,
    })),
    running_distance_km: e.running?.distanceKm ?? null,
    running_pace: e.running?.pace ?? '',
    running_meeting_point: e.running?.meetingPoint ?? '',
    running_categories: e.running?.categories ?? [],
    running_elevation_m: e.running?.elevationM ?? null,
    running_route_url: e.running?.routeUrl ?? '',
  };
}

// ---- Coaching API (Next.js API routes -> TursoDB) ----
// Always same-origin: React runs on Vercel, /api/* is on same host. No host hardcode.
//
// NOTE: Most coaching dashboard endpoints are NOT in the Go API yet.
// The Go API handles: users, training (exercises, workouts, templates), memberships, events, products, notifications, running.
// Coaching-specific features (time-blocks, messages, daily-summary, ai-suggestions, live-sessions, blog, etc.)
// remain on Next.js routes until they are ported to Go.
const COACHING_BASE = '/api/coaching'

// Reuse same-origin helper — coachingRequest is an alias to nextRequest
const coachingRequest = nextRequest
const coachingFetch = nextFetch

export const coachingApi = {
  // Time Blocks (not in Go API yet — Next.js fallback)
  getTimeBlocks: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/time-blocks`),
  saveTimeBlocks: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/time-blocks`, data),

  // Athletes — Go API (primary) with Next.js fallback on 404/501
  getAthletes: <T>() =>
    // Go API: GET /api/v1/coaches/:id/athletes (auth-derived coach ID)
    // Response format: { data: T[], total: number, page: number, limit: number }
    // T is the element type (e.g., AthleteBrief), not the array type
    goFetch<{ data: T[]; total: number; page: number; limit: number }>('/api/v1/coaches/me/athletes')
      .then((res) => (Array.isArray(res) ? res : res.data))
      .catch((err) => {
        if (!shouldFallbackToNextApi(err, 'GET')) throw err;
        return coachingFetch.get<T[]>(`${COACHING_BASE}/athletes`);
      }) as Promise<T[]>,
  getAthleteById: <T>(id: string) =>
    // Next.js: /api/coaching/athletes/:id (detailed athlete view)
    coachingFetch.get<T>(`${COACHING_BASE}/athletes/${id}`),
  saveAthlete: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/athletes`, data),
  updateAthlete: <T>(id: string, data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/athletes/${id}`, data),
  deleteAthlete: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/athletes/${id}`),

  // Sessions (not in Go API yet — Next.js fallback)
  getSessions: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/sessions`),
  saveSession: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/sessions`, data),
  updateSession: <T>(id: string, data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/sessions/${id}`, data),
  deleteSession: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/sessions/${id}`),

  // Messages (not in Go API yet — Next.js fallback)
  getMessageThreads: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/messages`),
  sendMessage: <T>(threadId: string, data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/messages/${threadId}`, data),
  createThread: <T>(data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/messages`, data),

  // Daily Summary (not in Go API yet — Next.js fallback)
  getDailySummary: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/daily-summary`),

  // Events — Go API (primary) with Next.js fallback on GET 404/501
  getEvents: () =>
    // Go API: GET /api/v1/events (returns { data: [snake_case] })
    goFetch<{ data?: GoEvent[] }>('/api/v1/events')
      .catch((err) => {
        if (!shouldFallbackToNextApi(err, 'GET')) throw err;
        return coachingFetch.get<CoachEvent[]>(`${COACHING_BASE}/events`);
      })
      .then((res) => (Array.isArray(res) ? res : (res.data ?? []).map(mapGoEvent))),
  saveEvent: (event: CoachEvent) =>
    // Go API: POST /api/v1/events (sends snake_case payload)
    goFetch<{ id: string }>('/api/v1/events', {
      method: 'POST',
      body: JSON.stringify(toGoEvent(event)),
    }),
  updateEvent: (id: string, event: CoachEvent) =>
    // Go API: PUT /api/v1/events/:id (sends snake_case payload)
    goFetch<{ ok: boolean }>(`/api/v1/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toGoEvent(event)),
    }),
  deleteEvent: (id: string) =>
    // Go API: DELETE /api/v1/events/:id
    goFetch<{ ok: boolean }>(`/api/v1/events/${id}`, { method: 'DELETE' }),
  getEventRegistrations: (eventId: string) =>
    // Go API: GET /api/v1/events/:id/registrations (coach-scoped)
    goFetch<{
      data?: Array<{
        id: string
        event_id: string
        athlete_id: string
        status: string
        created_at: string
        updated_at: string
      }>
    }>(`/api/v1/events/${eventId}/registrations`).then((res) =>
      (res.data ?? []).map((r) => ({
        id: r.id,
        eventId: r.event_id,
        athleteId: r.athlete_id,
        status: r.status as 'accepted' | 'cancelled',
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    ),
  // Event RSVP — public share-link endpoints (no auth; outside /api/v1)
  getPublicEvent: (id: string) =>
    // Go API: GET /public/events/:id (public events only)
    goFetch<GoEvent>(`/public/events/${id}`, { auth: false }).then(mapGoEvent),
  rsvpEvent: (eventId: string, data: {
    token?: string;
    status: 'accepted' | 'cancelled';
    name?: string;
    email?: string;
    phone?: string;
    category?: string;
    answers?: Array<{ field_id: string; value: string }>;
  }) =>
    // Go API: POST /public/events/:id/rsvp
    goFetch<{ token: string; status: string }>(`/public/events/${eventId}/rsvp`, {
      auth: false,
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getEventFormResponses: (eventId: string) =>
    // Go API: GET /api/v1/events/:id/form-responses (coach-scoped)
    goFetch<{
      data?: Array<{
        id: string
        event_id: string
        athlete_id: string
        field_id: string
        value: string
        created_at?: string
      }>
    }>(`/api/v1/events/${eventId}/form-responses`).then((res) =>
      (res.data ?? []).map((r) => ({
        id: r.id,
        eventId: r.event_id,
        athleteId: r.athlete_id,
        fieldId: r.field_id,
        value: r.value,
        createdAt: r.created_at ?? '',
      })),
    ),

  // Plans — Go API (primary) with Next.js fallback
  getPlans: <T>() =>
    // Go API: GET /api/v1/plans (coach plans, all statuses) — requires coach auth.
    // No fallback to Next.js API to avoid leaking plans of other coaches on public pages.
    goFetch<{ data?: GoPlan[] }>('/api/v1/plans')
      .then((res) => (Array.isArray(res) ? res : (res.data ?? []).map(mapGoPlan))),
  savePlan: <T>(_data: unknown) =>
    // Go API: POST /api/v1/plans
    goFetch<{ id: string }>('/api/v1/plans', {
      method: 'POST',
      body: JSON.stringify(_data),
    }) as Promise<T & { id: string }>,
  updatePlan: <T>(id: string, data: unknown) =>
    // Go API: PUT /api/v1/plans/:id
    goFetch<{ ok: boolean }>(`/api/v1/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<T & { ok: boolean }>,
  deletePlan: <T>(id: string) =>
    // Go API: DELETE /api/v1/plans/:id
    goFetch<{ ok: boolean }>(`/api/v1/plans/${id}`, {
      method: 'DELETE',
    }) as Promise<T & { ok: boolean }>,

  // Public plans & TRM — no auth
  getPublicPlans: <T>(coachId: string) =>
    goFetch<{ data?: GoPlan[] }>(`/public/coaches/${coachId}/plans`, { auth: false })
      .then((res) => (Array.isArray(res) ? res : (res.data ?? []).map(mapGoPlan))),
  getTRM: <T>() =>
    goFetch<T>(`/public/trm`, { auth: false }),

  // Public coach landing page — no auth
  // GET /public/coach/:slug  (coach profile + plan catalog)
  getPublicCoachPage: (slug: string) =>
    goFetch<CoachLandingResponse>(`/public/coach/${slug}`, { auth: false }),

  // Tickets (Support) — Go API (primary) with Next.js fallback on GET 404/501
  getTickets: <T>() =>
    // Go API: GET /api/v1/tickets (coach tickets, all statuses)
    goFetch<{ data?: SupportTicket[] }>('/api/v1/tickets')
      .catch((err) => {
        if (!shouldFallbackToNextApi(err, 'GET')) throw err;
        return coachingFetch.get<SupportTicket[]>(`${COACHING_BASE}/tickets`);
      })
      .then((res) => (Array.isArray(res) ? res : (res.data ?? []))),
  saveTicket: <T>(data: unknown) =>
    // Go API: POST /api/v1/tickets
    goFetch<{ id: string }>('/api/v1/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<T & { id: string }>,
  updateTicket: <T>(id: string, data: unknown) =>
    // Go API: PUT /api/v1/tickets/:id
    goFetch<{ ok: boolean }>(`/api/v1/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<T & { ok: boolean }>,
  deleteTicket: <T>(id: string) =>
    // Go API: DELETE /api/v1/tickets/:id
    goFetch<{ ok: boolean }>(`/api/v1/tickets/${id}`, { method: 'DELETE' }) as Promise<T & { ok: boolean }>,
  getTicket: <T>(id: string) =>
    goFetch<SupportTicket>(`/api/v1/tickets/${id}`).catch((err) => {
      if (!shouldFallbackToNextApi(err, 'GET')) throw err;
      return coachingFetch.get<SupportTicket>(`${COACHING_BASE}/tickets/${id}`);
    }),

  // Athlete tickets
  getAthleteTickets: <T>() =>
    goFetch<{ data?: SupportTicket[] }>('/api/v1/athlete/tickets')
      .catch((err) => {
        if (!shouldFallbackToNextApi(err, 'GET')) throw err;
        return coachingFetch.get<SupportTicket[]>(`${COACHING_BASE}/athlete/tickets`);
      })
      .then((res) => (Array.isArray(res) ? res : (res.data ?? []))),
  createAthleteTicket: <T>(data: unknown) =>
    goFetch<{ id: string }>('/api/v1/athlete/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<T & { id: string }>,
  getAthleteTicket: <T>(id: string) =>
    goFetch<SupportTicket>(`/api/v1/athlete/tickets/${id}`).catch((err) => {
      if (!shouldFallbackToNextApi(err, 'GET')) throw err;
      return coachingFetch.get<SupportTicket>(`${COACHING_BASE}/athlete/tickets/${id}`);
    }),

  // Ticket messages
  getTicketMessages: <T>(ticketId: string) =>
    goFetch<{ data?: TicketMessage[] }>(`/api/v1/tickets/${ticketId}/messages`)
      .then((res) => (Array.isArray(res) ? res : (res.data ?? []))),
  addTicketMessage: <T>(ticketId: string, data: unknown) =>
    goFetch<{ id: string }>(`/api/v1/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  markTicketRead: <T>(ticketId: string) =>
    goFetch<{ ok: boolean }>(`/api/v1/tickets/${ticketId}/read`, { method: 'POST' }),
  getTicketUnreadCount: <T>(ticketId: string) =>
    goFetch<{ count: number }>(`/api/v1/tickets/${ticketId}/unread`),

  // Assigned Workouts — Go API (primary) with Next.js fallback on GET 404/501
  getAssignedWorkouts: <T>() =>
    // Go API: GET /api/v1/workouts
    goFetch<T>('/api/v1/workouts').catch((err) => {
      if (!shouldFallbackToNextApi(err, 'GET')) throw err;
      return coachingFetch.get<T>(`${COACHING_BASE}/assigned-workouts`);
    }),
  saveAssignedWorkout: <T>(data: unknown) =>
    // Go API: POST /api/v1/workouts/assign
    goFetch<T>('/api/v1/workouts/assign', { method: 'POST', body: JSON.stringify(data) }),
  updateAssignedWorkout: <T>(id: string, data: unknown) =>
    // Go API: POST /api/v1/workouts/:id/sets (update workout)
    goFetch<T>(`/api/v1/workouts/${id}/sets`, { method: 'POST', body: JSON.stringify(data) }),
  deleteAssignedWorkout: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/assigned-workouts/${id}`),

  // AI Suggestions (not in Go API yet — Next.js fallback)
  getAISuggestions: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/ai-suggestions`),
  saveAISuggestion: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/ai-suggestions`, data),

  // Live Sessions (not in Go API yet — Next.js fallback)
  getLiveSessions: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/live-sessions`),
  saveLiveSession: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/live-sessions`, data),
  updateLiveSession: <T>(id: string, data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/live-sessions/${id}`, data),
  deleteLiveSession: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/live-sessions/${id}`),

  // Products — Go API (primary, snake_case contract normalized here)
  getProducts: () =>
    // Go API: GET /api/v1/products
    goFetch<{ data: GoProduct[] }>('/api/v1/products').then(res => res.data.map(mapGoProduct)),
  saveProduct: (data: Omit<Product, 'id' | 'createdAt'>) =>
    // Go API: POST /api/v1/products
    goFetch<{ id: string }>('/api/v1/products', { method: 'POST', body: JSON.stringify(toGoProduct(data)) }),
  updateProduct: (id: string, data: Partial<Product>) =>
    // Go API: PUT /api/v1/products/:id
    goFetch<{ ok: boolean }>(`/api/v1/products/${id}`, { method: 'PUT', body: JSON.stringify(toGoProduct(data)) }),
  deleteProduct: (id: string) =>
    // Go API: DELETE /api/v1/products/:id
    goFetch<{ ok: boolean }>(`/api/v1/products/${id}`, { method: 'DELETE' }),

  // Public Products (not in Go API yet — Next.js fallback)
  getPublicProducts: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/public-products`),

  // Sales — Go API (primary, snake_case contract normalized here)
  getSales: () =>
    // Go API: GET /api/v1/coaches/sales
    goFetch<{ data: GoSale[] }>('/api/v1/coaches/sales').then(res => res.data.map(mapGoSale)),
  saveSale: (data: Omit<Sale, 'id' | 'createdAt'>) =>
    // Go API: POST /api/v1/coaches/sales
    goFetch<{ id: string }>('/api/v1/coaches/sales', { method: 'POST', body: JSON.stringify(toGoSale(data)) }),
  deleteSale: (id: string) =>
    // Go API: DELETE /api/v1/coaches/sales/:id
    goFetch<{ ok: boolean }>(`/api/v1/coaches/sales/${id}`, { method: 'DELETE' }),

  // Coach earnings summary — Go API (primary)
  // Returns aggregated earnings: own product sales profit + ally commissions.
  getEarningsSummary: () =>
    // Go API: GET /api/v1/coach/earnings-summary
    goFetch<EarningsSummary>('/api/v1/coach/earnings-summary'),

  // Subscribe to live earnings events via Server-Sent Events.
  // The callback receives parsed SSE events ({ type, payload }).
  // Safe to call multiple times; each call opens its own EventSource.
  subscribeEarningsLive: (
    onEvent: (ev: RunningLiveEvent) => void,
  ): (() => void) => {
    if (typeof EventSource === 'undefined') {
      return () => {}
    }
    const es = new EventSource('/api/v1/coach/earnings-live')
    es.onmessage = (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data) as RunningLiveEvent
        onEvent(data)
      } catch {
        // ignore malformed messages
      }
    }
    es.onerror = () => {
      es.close()
    }
    return () => {
      es.close()
    }
  },

  // Ally product purchase — Go API (primary)
  // Athlete buys an ally product, automatically creating the operation and
  // accruing the commission for the coach.
  purchaseAllyProduct: (productId: string, quantity: number = 1) =>
    goFetch<AllyPurchaseResponse>(
      `/api/v1/athlete/ally/products/${productId}/purchase`,
      { method: 'POST', body: JSON.stringify({ quantity }) }
    ),

  // Dashboard (not in Go API yet — Next.js fallback)
  getDashboard: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/dashboard`),

  // Payment Availability (Wompi statuspage gate)
  getPaymentAvailability: () =>
    goFetch<PaymentAvailability>('/api/v1/payments/availability'),

  // Payment Methods (not in Go API yet — Next.js fallback)
  getPaymentMethods: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/payment-methods`),
  savePaymentMethod: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/payment-methods`, data),
  updatePaymentMethod: <T>(id: string, data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/payment-methods/${id}`, data),
  deletePaymentMethod: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/payment-methods/${id}`),

  // Landing content — Go API (primary source of truth).
  // Public visitors consume /public/landing (see components/landing/data.ts).
  getLanding: () =>
    // Go API: GET /api/v1/landing (coach-only)
    goFetch<LandingData>('/api/v1/landing'),
  saveLanding: (data: unknown) =>
    // Go API: PUT /api/v1/landing — saves and publishes a new version
    goFetch<{ message: string; version: number }>('/api/v1/landing', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  uploadLandingMedia: async (file: File) => {
    const { uploadMediaToR2 } = await import('@/lib/media/r2-upload')
    const res = await uploadMediaToR2(file, 'landing_media')
    return { url: res.mediaRef, previewUrl: res.previewUrl }
  },

  // Public Page Config (not in Go API yet — Next.js fallback)
  getPublicPageConfig: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/public-page`),
  updatePublicPageConfig: <T>(data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/public-page`, data),

  // Memberships — Go API (primary) with Next.js fallback on GET 404/501
  getMemberships: <T>() =>
    // Go API: GET /api/v1/memberships (athlete's own membership)
    goFetch<T>('/api/v1/memberships').catch((err) => {
      if (!shouldFallbackToNextApi(err, 'GET')) throw err;
      return coachingFetch.get<T>(`${COACHING_BASE}/memberships`);
    }),
  getCoachMemberships: <T>() =>
    // Go API: GET /api/v1/coaches/memberships (all athletes' memberships for coach)
    // Go returns snake_case — normalize to the camelCase shape pages expect.
    goFetch<{ data: Array<Record<string, unknown>> }>('/api/v1/coaches/memberships')
      .then(r => r.data.map((m: Record<string, unknown>) => ({
        ...m,
        athleteId: m.athleteId ?? m.athlete_id,
        planName: m.planName ?? m.plan_name,
        planPrice: m.planPrice ?? m.plan_price,
        paymentDueDate: m.paymentDueDate ?? m.payment_due_date,
      })) as T[])
      .catch((err) => {
        if (!shouldFallbackToNextApi(err, 'GET')) throw err;
        return coachingFetch.get<T[]>(`${COACHING_BASE}/memberships`);
      }),
  getMembership: <T>(athleteId: string) =>
    // Go API: GET /api/v1/memberships (auth-derived)
    goFetch<T>('/api/v1/memberships').catch((err) => {
      if (!shouldFallbackToNextApi(err, 'GET')) throw err;
      return coachingFetch.get<T>(`${COACHING_BASE}/membership/${athleteId}`);
    }),
  createMembership: <T>(data: unknown) =>
    // Go API: POST /api/v1/memberships
    goFetch<T>('/api/v1/memberships', { method: 'POST', body: JSON.stringify(data) }),
  cancelMembership: <T>(id: string) =>
    // Go API: PUT /api/v1/memberships/:id/cancel
    goFetch<T>(`/api/v1/memberships/${id}/cancel`, { method: 'PUT' }),
  getPaymentHistory: <T>(athleteId: string) =>
    // Go API: GET /api/v1/memberships/:id/payments
    goFetch<T>(`/api/v1/memberships/${athleteId}/payments`).catch((err) => {
      if (!shouldFallbackToNextApi(err, 'GET')) throw err;
      return coachingFetch.get<T>(`${COACHING_BASE}/payment-history/${athleteId}`);
    }),

  // Commercial policy engine — commission configuration and listing (Go API).
  // POST /api/v1/policies/commission — configure commission rate for the coach.
  configureCommission: (data: {
    relationshipId: string;
    rateBps: number;
    fixedAmountCents?: number;
    currency?: string;
    validFrom: string;
  }) =>
    goFetch<{ id: string; version: number; status: string }>('/api/v1/policies/commission', {
      method: 'POST',
      body: JSON.stringify({
        relationship_id: data.relationshipId,
        rate_bps: data.rateBps,
        fixed_amount_cents: data.fixedAmountCents ?? 0,
        currency: data.currency ?? 'COP',
        valid_from: data.validFrom,
      }),
    }),

  // GET /api/v1/commissions — list commission entries for the coach (RLS by coach).
  listCommissions: (params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return goFetch<{
      data: Array<{
        id: string;
        operation_id: string;
        relationship_id: string;
        coach_id: string;
        agreement_id: string;
        agreement_version: number;
        base_cents: number;
        rate_bps: number;
        fixed_amount_cents: number;
        amount_cents: number;
        currency: string;
        status: string;
        computed_at: string;
        created_at: string;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/api/v1/commissions${qs.toString() ? `?${qs}` : ''}`);
  },

  // Generic get for dynamic paths (Next.js fallback)
  get: <T>(path: string) => coachingFetch.get<T>(`${COACHING_BASE}${path}`),
};

// ---- Training intelligence (coach reads + exercise library) ----
export interface TrainingSummaryResponse {
  athleteId: string;
  windowDays: number;
  sessions: number;
  avgSessionsPerWeek: number;
  totalSets: number;
  totalVolumeKg: number;
  recentSessions: Array<{ date: string; workoutName: string; exercises: number }>;
}

export interface OneRmResponse {
  athleteId: string;
  exercises: Array<{
    exerciseKey: string;
    name: string;
    best: { est: number; weightKg: number; reps: number; date: string } | null;
    series: Array<{ t: number; d: string; y: number; weightKg: number; reps: number }>;
  }>;
}

export interface FatigueMapResponse {
  athleteId: string;
  windowDays: number;
  muscles: Array<{ muscle: string; level: number; state: 'ready' | 'recovering' | 'fatigued'; strength: number }>;
  neglectedMuscles: string[];
}

export interface EffortResponse {
  athleteId: string;
  enabled: boolean;
  windowDays?: number;
  hardRirThreshold?: number;
  summary?: { done: number; rated: number; hard: number; avg: number | null; hardPct: number | null };
  weeks?: Array<{ t: number; rir: number; ratedSets: number; totalSets: number }>;
  histogram?: Array<{ rir: number; tail: boolean; n: number; pct: number }>;
}

export interface HRZoneRow {
  zone1: number;
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
  totalTime: number;
  avgBpm: number | null;
  maxBpm: number | null;
  estimatedMaxHr: number;
}

export interface VideoAnalyticsRow {
  exerciseId: string;
  exerciseName: string;
  totalViews: number;
  completedViews: number;
  completionRate: number | null;
  avgPositionPct: number | null;
  lastViewedAt: string | null;
}

export interface VideoViewResponse {
  id: string;
  exerciseId: string;
  action: string;
  progressPct?: number;
  watchDurationSec?: number;
  createdAt: string;
}

export interface VideoAnalyticsSummary {
  totalSessions: number;
  totalReps: number;
  avgFormScore: number;
  totalDurationMin: number;
  exerciseCount: number;
}

export interface ExerciseAnalytics {
  exerciseId: string;
  exerciseName: string;
  totalSessions: number;
  totalReps: number;
  avgFormScore: number;
  bestFormScore: number;
  avgDuration: number;
}

export interface SessionAnalysis {
  id: string;
  athleteId: string;
  workoutId: string;
  exerciseId: string;
  exerciseName: string;
  durationSec: number;
  repCount: number;
  avgFormScore: number;
  minFormScore: number;
  maxFormScore: number;
  videoUrl: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const normalizeTrainingSummary = (
  raw: TrainingSummaryResponse | Record<string, unknown> | unknown[] | null | undefined,
  athleteId: string,
  days: number,
): TrainingSummaryResponse => {
  if (!raw || Array.isArray(raw)) {
    return {
      athleteId,
      windowDays: days,
      sessions: Array.isArray(raw) ? raw.length : 0,
      avgSessionsPerWeek: 0,
      totalSets: 0,
      totalVolumeKg: 0,
      recentSessions: [],
    };
  }
  const obj = raw as Partial<TrainingSummaryResponse>;
  return {
    athleteId: obj.athleteId ?? athleteId,
    windowDays: obj.windowDays ?? days,
    sessions: obj.sessions ?? 0,
    avgSessionsPerWeek: obj.avgSessionsPerWeek ?? 0,
    totalSets: obj.totalSets ?? 0,
    totalVolumeKg: obj.totalVolumeKg ?? 0,
    recentSessions: Array.isArray(obj.recentSessions) ? obj.recentSessions : [],
  };
};

const normalizeOneRm = (
  raw: OneRmResponse | Array<Record<string, unknown>> | null | undefined,
  athleteId: string,
): OneRmResponse => {
  if (Array.isArray(raw)) {
    return {
      athleteId,
      exercises: raw.map((item, idx) => ({
        exerciseKey: String(item.exerciseKey ?? item.exercise_id ?? idx),
        name: String(item.name ?? item.exercise_name ?? ''),
        best:
          (item.best as OneRmResponse['exercises'][number]['best']) ??
          (typeof item.one_rep_max === 'number'
            ? {
                est: Math.round(item.one_rep_max),
                weightKg: Math.round(item.one_rep_max),
                reps: 1,
                date: String(item.last_updated ?? ''),
              }
            : null),
        series: Array.isArray(item.series) ? (item.series as OneRmResponse['exercises'][number]['series']) : [],
      })),
    };
  }
  const obj = (raw ?? {}) as Partial<OneRmResponse>;
  return {
    athleteId: obj.athleteId ?? athleteId,
    exercises: Array.isArray(obj.exercises) ? obj.exercises : [],
  };
};

const normalizeFatigueMap = (
  raw: FatigueMapResponse | Array<Record<string, unknown>> | null | undefined,
  athleteId: string,
  days: number,
): FatigueMapResponse => {
  if (Array.isArray(raw)) {
    const muscles = raw
      .filter((m) => typeof m.muscle === 'string')
      .map((m) => ({
        muscle: String(m.muscle),
        level: Number(m.level ?? 0),
        state: (m.state === 'ready' || m.state === 'recovering' || m.state === 'fatigued' ? m.state : 'ready') as
          | 'ready'
          | 'recovering'
          | 'fatigued',
        strength: Number(m.strength ?? 0),
      }));
    return {
      athleteId,
      windowDays: days,
      muscles,
      neglectedMuscles: [],
    };
  }
  const obj = (raw ?? {}) as Partial<FatigueMapResponse>;
  return {
    athleteId: obj.athleteId ?? athleteId,
    windowDays: obj.windowDays ?? days,
    muscles: Array.isArray(obj.muscles) ? obj.muscles : [],
    neglectedMuscles: Array.isArray(obj.neglectedMuscles) ? obj.neglectedMuscles : [],
  };
};

const normalizeEffort = (
  raw: EffortResponse | Array<Record<string, unknown>> | null | undefined,
  athleteId: string,
  days: number,
): EffortResponse => {
  if (Array.isArray(raw)) {
    const hardCount = raw.filter((e) => Number(e.rpe ?? 0) >= 8).length;
    return {
      athleteId,
      enabled: raw.length > 0,
      windowDays: days,
      hardRirThreshold: 2,
      summary:
        raw.length > 0
          ? {
              done: raw.length,
              rated: raw.length,
              hard: hardCount,
              avg: raw.reduce((sum, e) => sum + Number(e.rpe ?? e.effort_score ?? 0), 0) / raw.length,
              hardPct: hardCount / raw.length,
            }
          : undefined,
      weeks: [],
      histogram: [],
    };
  }
  const obj = (raw ?? {}) as Partial<EffortResponse>;
  return {
    athleteId: obj.athleteId ?? athleteId,
    enabled: Boolean(obj.enabled),
    windowDays: obj.windowDays ?? days,
    hardRirThreshold: obj.hardRirThreshold,
    summary: obj.summary,
    weeks: Array.isArray(obj.weeks) ? obj.weeks : undefined,
    histogram: Array.isArray(obj.histogram) ? obj.histogram : undefined,
  };
};

// Training API — Go backend (primary) with Next.js fallback.
// Go endpoints: /api/v1/progress, /api/v1/exercises, /athlete/:id/analytics/*
// Next.js fallback: /api/coach/athletes/:id/*, /api/coach/video-analytics
export const trainingApi = {
  getTrainingSummary: (athleteId: string, days = 28): Promise<TrainingSummaryResponse> =>
    // Go: GET /athlete/:id/analytics/training-summary
    goFetch<TrainingSummaryResponse | Record<string, unknown> | unknown[]>(
      `/api/v1/athlete/${athleteId}/analytics/training-summary?days=${days}`,
    )
      .catch((err) => {
        if (!shouldFallbackToNextApi(err, 'GET')) throw err;
        return nextFetch.get<TrainingSummaryResponse>(`/api/coach/athletes/${athleteId}/training-summary?days=${days}`);
      })
      .then((res) => normalizeTrainingSummary(res, athleteId, days)),

  getOneRm: (athleteId: string): Promise<OneRmResponse> =>
    // Go: GET /athlete/:id/analytics/one-rm
    goFetch<OneRmResponse | Array<Record<string, unknown>>>(`/api/v1/athlete/${athleteId}/analytics/one-rm`)
      .catch((err) => {
        if (!shouldFallbackToNextApi(err, 'GET')) throw err;
        return nextFetch.get<OneRmResponse>(`/api/coach/athletes/${athleteId}/one-rm`);
      })
      .then((res) => normalizeOneRm(res, athleteId)),

  getFatigueMap: (athleteId: string, days = 7): Promise<FatigueMapResponse> =>
    // Go: GET /athlete/:id/analytics/fatigue-map
    goFetch<FatigueMapResponse | Array<Record<string, unknown>>>(
      `/api/v1/athlete/${athleteId}/analytics/fatigue-map?days=${days}`,
    )
      .catch((err) => {
        if (!shouldFallbackToNextApi(err, 'GET')) throw err;
        return nextFetch.get<FatigueMapResponse>(`/api/coach/athletes/${athleteId}/fatigue-map?days=${days}`);
      })
      .then((res) => normalizeFatigueMap(res, athleteId, days)),

  getEffort: (athleteId: string, days = 28): Promise<EffortResponse> =>
    // Go: GET /athlete/:id/analytics/effort
    goFetch<EffortResponse | Array<Record<string, unknown>>>(
      `/api/v1/athlete/${athleteId}/analytics/effort?days=${days}`,
    )
      .catch((err) => {
        if (!shouldFallbackToNextApi(err, 'GET')) throw err;
        return nextFetch.get<EffortResponse>(`/api/coach/athletes/${athleteId}/effort?days=${days}`);
      })
      .then((res) => normalizeEffort(res, athleteId, days)),

  /** Wearable-derived health signals (HRV/RHR/steps/sleep) for one athlete. */
  getHealth: async (athleteId: string, days = 14): Promise<AthleteHealthResponse> => {
    const [metricsRes, sleepRes, devicesRes] = await Promise.all([
      goFetch<{ metrics?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>(
        `/api/v1/health/metrics?athlete_id=${athleteId}&days=${days}`
      ).catch(() => ({ metrics: [] })),
      goFetch<{ sleepLogs?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>(
        `/api/v1/health/sleep?athlete_id=${athleteId}&days=${days}`
      ).catch(() => ({ sleepLogs: [] })),
      goFetch<{ devices?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>(
        `/api/v1/health/devices?athlete_id=${athleteId}`
      ).catch(() => ({ devices: [] })),
    ]);

    const rawMetrics = Array.isArray(metricsRes) ? metricsRes : (metricsRes.metrics ?? []);
    const rawSleeps = Array.isArray(sleepRes) ? sleepRes : (sleepRes.sleepLogs ?? []);
    const rawDevices = Array.isArray(devicesRes) ? devicesRes : (devicesRes.devices ?? []);

    const metrics: HealthMetric[] = rawMetrics.map((m) => ({
      id: String(m.id ?? ''),
      athleteId: String(m.athleteId ?? m.athlete_id ?? athleteId),
      metricType: String(m.metricType ?? m.metric_type ?? ''),
      value: Number(m.value ?? 0),
      unit: String(m.unit ?? ''),
      source: String(m.source ?? ''),
      sourceWorkoutId: (m.sourceWorkoutId ?? m.source_workout_id ?? undefined) as string | undefined,
      recordedAt: String(m.recordedAt ?? m.recorded_at ?? ''),
      syncedAt: String(m.syncedAt ?? m.synced_at ?? ''),
    }));

    const sleepLogs: SleepLog[] = rawSleeps.map((s) => ({
      id: String(s.id ?? ''),
      athleteId: String(s.athleteId ?? s.athlete_id ?? athleteId),
      date: String(s.date ?? ''),
      totalMinutes: Number(s.totalMinutes ?? s.total_minutes ?? 0),
      deepMinutes: s.deepMinutes != null ? Number(s.deepMinutes) : s.deep_minutes != null ? Number(s.deep_minutes) : null,
      remMinutes: s.remMinutes != null ? Number(s.remMinutes) : s.rem_minutes != null ? Number(s.rem_minutes) : null,
      lightMinutes: s.lightMinutes != null ? Number(s.lightMinutes) : s.light_minutes != null ? Number(s.light_minutes) : null,
      awakeMinutes: s.awakeMinutes != null ? Number(s.awakeMinutes) : s.awake_minutes != null ? Number(s.awake_minutes) : null,
      efficiency: s.efficiency != null ? Number(s.efficiency) : null,
      score: s.score != null ? Number(s.score) : null,
      source: String(s.source ?? ''),
    }));

    const devices: HealthDevice[] = rawDevices.map((d) => ({
      id: String(d.id ?? ''),
      athleteId: String(d.athleteId ?? d.athlete_id ?? athleteId),
      platform: String(d.platform ?? ''),
      deviceName: String(d.deviceName ?? d.device_name ?? ''),
      deviceBrand: String(d.deviceBrand ?? d.device_brand ?? ''),
      isActive: Boolean(d.isActive ?? d.is_active ?? false),
      lastSyncAt: (d.lastSyncAt ?? d.last_sync_at ?? null) as string | null,
      createdAt: String(d.createdAt ?? d.created_at ?? ''),
    }));

    // Split metrics by type
    const hrv = metrics
      .filter(m => m.metricType === 'hrv')
      .map(m => ({ value: m.value, recordedAt: m.recordedAt, metricType: m.metricType, source: m.source }));
    const restingHr = metrics
      .filter(m => m.metricType === 'resting_hr' || m.metricType === 'rhr')
      .map(m => ({ value: m.value, recordedAt: m.recordedAt, metricType: m.metricType, source: m.source }));
    const manualReadiness = metrics
      .filter(m => m.metricType === 'readiness' || m.metricType === 'manual_readiness')
      .map(m => ({ value: m.value, recordedAt: m.recordedAt, metricType: m.metricType, source: m.source }));
    const steps = metrics
      .filter(m => m.metricType === 'steps')
      .map(m => ({ value: m.value, recordedAt: m.recordedAt, metricType: m.metricType, source: m.source }));
    const activeCalories = metrics
      .filter(m => m.metricType === 'active_calories')
      .map(m => ({ value: m.value, recordedAt: m.recordedAt, metricType: m.metricType, source: m.source }));
    const vo2max = metrics
      .filter(m => m.metricType === 'vo2max')
      .map(m => ({ value: m.value, recordedAt: m.recordedAt, metricType: m.metricType, source: m.source }));

    return {
      metrics,
      sleepLogs,
      devices,
      hrv,
      restingHr,
      manualReadiness,
      steps,
      activeCalories,
      vo2max,
      windowDays: days,
    };
  },

  /** HR zone distribution for a time window (e.g., during a workout). */
  getHrZones: async (athleteId: string, from?: string, to?: string): Promise<{ hrZones: HRZoneRow; sampleCount: number }> => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString() ? `?${params.toString()}` : '';
    try {
      // Go: GET /api/v1/athlete/:id/analytics/hr-zones returns HRZone[] (timeMinutes per zone 1..5)
      const raw = await goFetch<
        | { hrZones: HRZoneRow; sampleCount: number }
        | Array<{ zone: number; minBpm?: number; maxBpm?: number; percent?: number; timeMinutes?: number; time_minutes?: number }>
      >(`/api/v1/athlete/${athleteId}/analytics/hr-zones${qs}`);

      if (raw && !Array.isArray(raw) && 'hrZones' in raw) {
        return raw;
      }

      const zones = Array.isArray(raw) ? raw : [];
      const secByZone: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sampleCount = 0;
      for (const z of zones) {
        const mins = Number(z.timeMinutes ?? z.time_minutes ?? 0);
        if (z.zone >= 1 && z.zone <= 5) {
          secByZone[z.zone] = mins * 60;
          sampleCount += mins;
        }
      }
      const totalTime = secByZone[1] + secByZone[2] + secByZone[3] + secByZone[4] + secByZone[5];
      return {
        hrZones: {
          zone1: secByZone[1],
          zone2: secByZone[2],
          zone3: secByZone[3],
          zone4: secByZone[4],
          zone5: secByZone[5],
          totalTime,
          avgBpm: null,
          maxBpm: null,
          estimatedMaxHr: 190,
        },
        sampleCount,
      };
    } catch (err) {
      if (!shouldFallbackToNextApi(err, 'GET')) throw err;
      return nextFetch.get<{ hrZones: HRZoneRow; sampleCount: number }>(
        `/api/coach/athletes/${athleteId}/hr-zones${qs}`
      );
    }
  },

  /** Aggregate video view analytics across all exercises for one athlete. */
  getVideoAnalytics: (athleteId: string): Promise<VideoAnalyticsRow[]> =>
    // Go API: GET /api/v1/coach/athletes/:athleteId/video-analytics
    goFetch<{ analytics?: VideoAnalyticsRow[] } | VideoAnalyticsRow[]>(
      `/api/v1/coach/athletes/${athleteId}/video-analytics`,
    ).then((res) => (Array.isArray(res) ? res : (res?.analytics ?? []))),
};

// ---- Video View API ----
// Go endpoints: POST /api/v1/video-views
export const videoViewApi = {
  record: (data: { exerciseId: string; action: 'start' | 'progress' | 'complete'; progressPct?: number; watchDurationSec?: number }) =>
    // Go API: POST /api/v1/video-views
    goFetch<VideoViewResponse>('/api/v1/video-views', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ---- Video Analytics API ----
// Go endpoints: GET /api/v1/video-analytics/summary, GET /api/v1/video-analytics/per-exercise, GET /api/v1/video-analytics/sessions, POST /api/v1/video-analytics/track
export const videoAnalyticsApi = {
  getSummary: () =>
    // Go API: GET /api/v1/video-analytics/summary
    goFetch<VideoAnalyticsSummary>('/api/v1/video-analytics/summary'),

  getPerExercise: (): Promise<ExerciseAnalytics[]> =>
    // Go API: GET /api/v1/video-analytics/per-exercise
    goFetch<{ exercises?: ExerciseAnalytics[] } | ExerciseAnalytics[]>('/api/v1/video-analytics/per-exercise')
      .then((res) => (Array.isArray(res) ? res : (res?.exercises ?? []))),

  getSessions: (): Promise<SessionAnalysis[]> =>
    // Go API: GET /api/v1/video-analytics/sessions
    goFetch<{ sessions?: SessionAnalysis[] } | SessionAnalysis[]>('/api/v1/video-analytics/sessions')
      .then((res) => (Array.isArray(res) ? res : (res?.sessions ?? []))),

  trackSession: (data: { workoutId: string; exerciseId: string; durationSec: number; repCount: number; avgFormScore: number; minFormScore: number; maxFormScore: number; videoUrl?: string }) =>
    // Go API: POST /api/v1/video-analytics/track
    goFetch<SessionAnalysis>('/api/v1/video-analytics/track', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export interface Appointment {
  id: string;
  athleteId: string;
  coachId: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoachAvailability {
  id: string;
  coachId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface AppointmentResponse {
  id: string;
  athleteId: string;
  coachId: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoachAvailabilityResponse {
  id: string;
  coachId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export const appointmentApi = {
  getAppointments: () =>
    // Go API: GET /api/v1/athlete/appointments
    goFetch<Appointment[]>(`/api/v1/athlete/appointments`),

  createAppointment: (data: { date: string; startTime: string; endTime: string; notes?: string; coachId: string }) =>
    // Go API: POST /api/v1/athlete/appointments
    goFetch<Appointment>(`/api/v1/athlete/appointments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAppointment: (id: string, data: Partial<{ status: string; notes?: string; date?: string; startTime?: string; endTime?: string }>) =>
    // Go API: PUT /api/v1/athlete/appointments/:id
    goFetch<{ ok: boolean }>(`/api/v1/athlete/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteAppointment: (id: string) =>
    // Go API: DELETE /api/v1/athlete/appointments/:id
    goFetch<{ ok: boolean }>(`/api/v1/athlete/appointments/${id}`, { method: 'DELETE' }),
};

export const availabilityApi = {
  getAvailability: (coachId: string) =>
    // Go API: GET /api/v1/athlete/availability?coachId=...
    goFetch<CoachAvailability[]>(`/api/v1/athlete/availability?coachId=${coachId}`),

  saveAvailability: (data: { coachId: string; slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }> }) =>
    // Go API: POST /api/v1/athlete/availability
    goFetch<{ ok: boolean }>(`/api/v1/athlete/availability`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export interface ExerciseLibraryEntry {
  id: string;
  slug: string;
  name: string;
  description: string;
  mode: 'reps' | 'time' | 'cardio';
  bodyPart: string | null;
  muscleGroups: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  difficulty: string | null;
  category: string | null;
  instructions: string[];
  defaultSec: number | null;
  videoUrl: string | null;
  imageUrl: string | null;
  isCustom: boolean;
}

// Exercise API — Go backend (primary) for list and create.
 // Go endpoints: GET /api/v1/exercises, POST /api/v1/exercises
 // PUT/DELETE not in Go API yet → Next.js fallback /api/exercises/:id
// The Go API returns flat exercise rows with `bodyPart` (string) and
// `instructions` (newline-separated string). Normalize to the UI shape:
// muscleGroups array + instructions array.
function normalizeExerciseEntry(raw: Record<string, unknown>): ExerciseLibraryEntry {
  return {
    ...(raw as unknown as ExerciseLibraryEntry),
    muscleGroups: Array.isArray(raw.muscleGroups)
      ? raw.muscleGroups as string[]
      : raw.bodyPart ? [raw.bodyPart as string] : [],
    instructions: Array.isArray(raw.instructions)
      ? raw.instructions as string[]
      : String(raw.instructions ?? '').split('\n').map((s: string) => s.trim()).filter(Boolean),
  };
}

export const exerciseApi = {
  list: () =>
    // Go API: GET /api/v1/exercises (returns { data: [...] })
    goFetch<{ data: Array<Record<string, unknown>> }>('/api/v1/exercises')
      .then(res => ({ exercises: (res.data || []).map(normalizeExerciseEntry) })),

  create: (data: Record<string, unknown>) =>
    // Go API: POST /api/v1/exercises (coach only) — returns the flat row
    goFetch<Record<string, unknown>>('/api/v1/exercises', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(raw => ({ exercise: normalizeExerciseEntry(raw) })),

  update: (id: string, data: Record<string, unknown>) =>
    // Go API: PUT /api/v1/exercises/:id — returns the flat row
    goFetch<Record<string, unknown>>(`/api/v1/exercises/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).then(raw => ({ exercise: normalizeExerciseEntry(raw) })),

  remove: (id: string) =>
    // Go API: DELETE /api/v1/exercises/:id
    goFetch<{ ok: boolean }>(`/api/v1/exercises/${id}`, { method: 'DELETE' }),

  uploadVideo: async (file: File, onProgress?: (percent: number) => void) => {
    const { uploadMediaToR2 } = await import('@/lib/media/r2-upload')
    const res = await uploadMediaToR2(file, 'exercise_video', { onProgress })
    return { url: res.mediaRef, videoUrl: res.mediaRef, previewUrl: res.previewUrl }
  },
};

// ---- Device API (Push notification devices) ----
// Go endpoints: GET/POST/DELETE /api/v1/devices
export const deviceApi = {
  list: () =>
    // Go API: GET /api/v1/devices
    goFetch<Device[]>(`/api/v1/devices`),

  register: (data: { token: string; platform: string }) =>
    // Go API: POST /api/v1/devices
    goFetch<Device>(`/api/v1/devices`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    // Go API: DELETE /api/v1/devices/:id
    goFetch<{ ok: boolean }>(`/api/v1/devices/${id}`, { method: 'DELETE' }),
};

// ---- Notification API ----
// Go endpoints: GET /api/v1/notifications, PATCH /api/v1/notifications/:id/read, PATCH /api/v1/notifications/read-all
export const notificationApi = {
  list: () =>
    // Go API: GET /api/v1/notifications
    goFetch<{ data: Notification[] }>(`/api/v1/notifications`).then(r => r.data),

  markRead: (id: string) =>
    // Go API: PATCH /api/v1/notifications/:id/read
    goFetch<{ ok: boolean }>(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    // Go API: PATCH /api/v1/notifications/read-all
    goFetch<{ ok: boolean }>(`/api/v1/notifications/read-all`, { method: 'PATCH' }),
};

export const communityApi = {
  getCommunity: () =>
    // Go API: GET /api/v1/athlete/community
    goFetch<CommunityResponse>(`/api/v1/athlete/community`),

  getMessages: (forumId: string) =>
    // Go API: GET /api/v1/athlete/community/messages?forumId=...
    goFetch<{ data: CommunityMessage[] }>(`/api/v1/athlete/community/messages?forumId=${forumId}`).then(r => r.data),

  createMessage: (data: { forumId: string; message: string }) =>
    // Go API: POST /api/v1/athlete/community/messages
    goFetch<{ id: string }>(`/api/v1/athlete/community/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export interface ForumTopic {
  id: string;
  title: string;
  description: string;
  category: string;
}

export interface ChallengeSummary {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  calories: number;
  participantsCount: number;
}

export interface CommunityMessage {
  id: string;
  forumId: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
}

export interface CommunityResponse {
  forums: ForumTopic[];
  challenges: ChallengeSummary[];
}

export interface CommunityMessage {
  id: string;
  forumId: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
}

export interface CommunityResponse {
  forums: ForumTopic[];
  challenges: ChallengeSummary[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  icon?: string;
  read: boolean;
  createdAt: string;
}

export interface Device {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  created_at: string;
}

export interface HealthMetric {
  id: string;
  athleteId: string;
  metricType: string;
  value: number;
  unit: string;
  source: string;
  sourceWorkoutId?: string;
  recordedAt: string;
  syncedAt: string;
}

export interface HealthSeriesRow {
  value: number;
  recordedAt: string;
  metricType?: string;
  source?: string;
}

export interface SleepLog {
  id: string;
  athleteId: string;
  date: string;
  totalMinutes: number;
  deepMinutes: number | null;
  remMinutes: number | null;
  lightMinutes: number | null;
  awakeMinutes: number | null;
  efficiency: number | null;
  score: number | null;
  source: string;
}

export interface HealthDevice {
  id: string;
  athleteId: string;
  platform: string;
  deviceName: string;
  deviceBrand: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

export interface AthleteHealthResponse {
  metrics: HealthMetric[];
  sleepLogs: SleepLog[];
  devices: HealthDevice[];
  hrv: HealthSeriesRow[];
  restingHr: HealthSeriesRow[];
  manualReadiness: HealthSeriesRow[];
  steps: HealthSeriesRow[];
  activeCalories: HealthSeriesRow[];
  vo2max: HealthSeriesRow[];
  windowDays: number;
}


// ---- Workout templates (builder-saved plans) + past-assignment reuse ----
export interface WorkoutTemplateSummary {
  id: string;
  name: string;
  description: string;
  goal: string;
  estimatedDurationMinutes: number | null;
  exerciseCount: number;
  createdAt: string;
}

export interface RunningIntervalRow {
  order: number
  workType: 'time' | 'distance'
  workValue: number
  restSeconds: number
  paceTarget?: string
  intensity?: 'easy' | 'tempo' | 'threshold' | 'vo2max'
}

export interface TemplateExerciseRow {
  id?: string;
  name?: string;
  exerciseName?: string;
  sets?: unknown;
  reps?: number | string;
  weightKg?: number | null;
  weight?: number | null;
  restSeconds?: number | null;
  rest?: number | null;
  sortOrder?: number;
  order?: number;
  notes?: string | null;
  /** Go returns muscleGroups as a JSON string; legacy may pass an array. */
  muscleGroups?: string | string[];
  libraryExerciseId?: string | null;
  /** Running route as an encoded GPS polyline (lat,lng pairs). */
  gpsRoute?: string | null;
  /** Running intervals for running workouts. */
  intervals?: RunningIntervalRow[]
}

export interface WorkoutTemplateExercise {
  id: string;
  templateId: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  restSeconds: number;
  sortOrder: number;
  notes: string;
  mode: string;
  phase: string;
  supersetGroup: string;
  bodyPart: string;
  /** Go stores muscle groups as a JSON string; clients parse it to an array. */
  muscleGroups: string;
  libraryExerciseId: string;
}

export interface WorkoutTemplateDetail extends WorkoutTemplateSummary {
  coachId: string;
  updatedAt: string;
  exercises: WorkoutTemplateExercise[];
}

interface GoTemplatesList {
  data: WorkoutTemplateSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface PastAssignmentDetail {
  id: string;
  athleteId: string;
  athleteName: string;
  contentName: string;
  status: string;
  progress: number;
  startDate: string;
  exercises: Array<{
    id: string;
    name: string;
    sets: number;
    reps: number;
    weightKg: number | null;
    restSeconds: number | null;
    sortOrder: number;
    mode: 'reps' | 'time' | 'cardio';
    muscleGroups: string[];
    libraryExerciseId: string | null;
  }>;
}

// Template API — Go backend (primary).
// Go endpoints: /api/v1/workout-templates (GET list, GET/:id, POST, PUT).
// DELETE is not yet exposed by Go; removal stays on the Next.js route.
export const templateApi = {
  list: () =>
    // Go API: GET /api/v1/workout-templates → { data: [...], total, page, limit }
    goFetch<GoTemplatesList>('/api/v1/workout-templates')
      .then((res) => res.data ?? []),

  get: (id: string) =>
    // Go API: GET /api/v1/workout-templates/:id → single WorkoutTemplateDetail
    goFetch<WorkoutTemplateDetail>(`/api/v1/workout-templates/${id}`)
      .then((template) => ({ template })),

  create: (data: { name: string; description?: string; goal?: string; estimatedDurationMinutes?: number | null; exercises?: TemplateExerciseRow[]; id?: string }) =>
    // Go API: POST /api/v1/workout-templates → single WorkoutTemplateDetail
    goFetch<WorkoutTemplateDetail>('/api/v1/workout-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((res) => ({ id: res.id })),

  update: (id: string, data: { name: string; description?: string; goal?: string; estimatedDurationMinutes?: number | null; exercises?: TemplateExerciseRow[] }) =>
    // Go API: PUT /api/v1/workout-templates/:id → single WorkoutTemplateDetail
    goFetch<WorkoutTemplateDetail>(`/api/v1/workout-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).then((res) => ({ id: res.id })),

  remove: (id: string) =>
    // Go API: DELETE /api/v1/workout-templates/:id
    goFetch<{ ok?: boolean }>(`/api/v1/workout-templates/${id}`, {
      method: 'DELETE',
    }),

  /** Full detail of a previously assigned workout, for reassignment flows. */
  getPastAssignment: (id: string) =>
    // Go API: GET /api/v1/workouts/:id
    goFetch<PastAssignmentDetail>(`/api/v1/workouts/${id}`).catch((err) => {
      if (!shouldFallbackToNextApi(err, 'GET')) throw err;
      return nextFetch.get<PastAssignmentDetail>(`/api/coaching/assigned-workouts/${id}`);
    }),

  /** Coach's assignment history (list view, no exercises). */
  listPastAssignments: () =>
    // Go API: GET /api/v1/workouts
    goFetch<PastAssignmentListItem[]>('/api/v1/workouts').catch((err) => {
      if (!shouldFallbackToNextApi(err, 'GET')) throw err;
      return nextFetch.get<PastAssignmentListItem[]>('/api/coaching/assigned-workouts');
    }),
};

export interface PastAssignmentListItem {
  id: string;
  athleteId: string;
  athleteName: string;
  contentId: string;
  contentType: string;
  contentName: string;
  status: string;
  progress: number;
}

// ---- Running (Go API) ----
export interface WeeklyTrendPoint {
  week: string
  distance: number
  sessions: number
  avgPaceSec: number
  avgHeartRate: number
}

export interface RunningSession {
  id: string
  date: string
  distance: number      // km
  duration: number      // seconds
  pace: string          // "5:30" min/km
  speed: number         // km/h
  calories: number
  elevation: number     // meters
  heartRate: number
  cadence: number
  gpsRoute?: string     // encoded polyline
  source: string        // "manual", "apple_watch", "garmin", "healthkit", "health_connect", "mobile_gps"
  deviceName?: string
  deviceBrand?: string
  createdAt: string
}

export interface RunningStats {
  totalSessions: number
  totalDistance: number   // km
  totalDuration: number   // seconds
  totalCalories: number
  totalElevation: number  // meters
  avgDistance: number
  avgDuration: number
  avgCalories: number
  avgHeartRate: number
  avgPace: string         // "5:30"
}

export interface RunningPRsResponse {
  bestPace: string     // "5:30" min/km
  longestRun: number   // km
  fastest1K: number    // seconds
  fastest5K: number    // seconds
  fastest10K: number   // seconds
  totalRuns: number
}

export interface GpsPoint {
  id: string
  sessionId: string
  lat: number
  lng: number
  alt?: number        // meters
  timestamp: string   // RFC3339 UTC
  accuracy?: number   // meters
}

export interface RunningSessionDetail {
  session: RunningSession
  gpsPoints: GpsPoint[]
}

/** Get paginated running sessions for the authenticated user. */
export const getRunningSessions = (
  page = 1,
  limit = 20,
  fromDate?: string,
  toDate?: string
) =>
  goFetch<{ data: RunningSession[]; total: number; page: number; limit: number }>(
    `/api/v1/running/sessions${buildQuery({ page, limit, from_date: fromDate, to_date: toDate })}`
  ).then((res) => res.data)

/** Get a single running session with its GPS points. */
export const getRunningSession = (id: string) =>
  goFetch<RunningSessionDetail>(`/api/v1/running/sessions/${id}`)

/** Get aggregated running statistics. */
export const getRunningStats = (fromDate?: string, toDate?: string) =>
  goFetch<RunningStats>(
    `/api/v1/running/stats${buildQuery({ from_date: fromDate, to_date: toDate })}`
  )

/** Log a new running session. */
export const logRunningSession = (data: {
  date: string
  distance: number
  duration: number
  pace?: string
  calories?: number
  elevation?: number
  heartRate?: number
  cadence?: number
  gpsRoute?: string
  source?: string
}) =>
  goFetch<{ id: string }>('/api/v1/running/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  })

/** Record a single GPS sample for live tracking. */
export const logGpsPoint = (sessionId: string, data: {
  lat: number
  lng: number
  alt?: number
  timestamp: string
  accuracy?: number
}) =>
  goFetch<GpsPoint>(`/api/v1/running/sessions/${sessionId}/live-location`, {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, ...data }),
  })

/** Record a batch of GPS samples (client-side batching, max 100/request). */
export const logGpsBatch = (
  sessionId: string,
  points: { lat: number; lng: number; alt?: number; timestamp: string; accuracy?: number }[]
) =>
  goFetch<{ received: number; saved: number }>(
    `/api/v1/running/sessions/${sessionId}/live-location`,
    { method: 'POST', body: JSON.stringify({ session_id: sessionId, points }) }
  )

/** Close a live-tracked run with final totals (recalculates pace/speed server-side). */
export const updateRunningSession = (
  id: string,
  data: {
    distance?: number
    duration?: number
    pace?: string
    calories?: number
    elevation?: number
    heart_rate?: number
    cadence?: number
    gps_route?: string
  }
) =>
  goFetch<RunningSession>(`/api/v1/running/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

/** Delete a running session owned by the authenticated user. */
export const deleteRunningSession = (id: string) =>
  goFetch<{ message: string }>(`/api/v1/running/sessions/${id}`, {
    method: 'DELETE',
  })

// ---- Running workout completion (Go API) ----

export interface CompleteRunningWorkoutRequest {
  workoutId: string
  durationSeconds: number
  actualGpsRoute?: string
  actualIntervals?: RunningInterval[]
}

export interface RunningInterval {
  order: number
  workType: 'time' | 'distance'
  workValue: number
  restSeconds: number
  paceTarget?: string
  intensity?: 'easy' | 'tempo' | 'threshold' | 'vo2max'
}

export interface CompletedRunningWorkoutDetail {
  workout_id: string
  athlete_id: string
  workout_name: string
  status: string
  completed_at: string
  duration_seconds: number
  running_exercises: {
    id: string
    name: string
    prescribedGpsRoute: string
    prescribedIntervals: RunningInterval[]
    actualGpsRoute: string
    actualIntervals: RunningInterval[]
  }[]
}

/** Complete a running workout with actual GPS and interval data. */
export const completeRunningWorkout = (request: CompleteRunningWorkoutRequest) =>
  goFetch<{ ok: boolean }>(`/api/v1/workouts/${request.workoutId}/complete-running`, {
    method: 'POST',
    body: JSON.stringify(request),
  })

/** Get completed running workout detail with actual GPS and intervals. */
export const getCompletedRunningWorkout = (workoutId: string) =>
  goFetch<CompletedRunningWorkoutDetail>(`/api/v1/workouts/${workoutId}/running-complete`)

/** Subscribe to live running-workout progress via Server-Sent Events.
 *
 * Returns an unsubscribe function. The callback receives parsed SSE events
 * ({ type, payload }). Safe to call multiple times; each call opens its own
 * EventSource. The SSE endpoint enforces ownership (coach or athlete).
 */
export type RunningLiveEvent = {
  type: string
  payload: Record<string, unknown>
}

export interface AllyPurchaseResponse {
  operation_id: string
  operation_kind: string
  relationship_id: string
  ally_id: string
  commission_entry_id: string
  commission_cents: number
  total_cents: number
  currency: string
}

export const subscribeRunningLive = (
  workoutId: string,
  onEvent: (ev: RunningLiveEvent) => void,
): (() => void) => {
  if (typeof EventSource === 'undefined') {
    // Non-browser environment (SSR): no-op.
    return () => {}
  }
  const url = `/api/v1/workouts/${workoutId}/running-live`
  const es = new EventSource(url)
  es.onmessage = (evt: MessageEvent) => {
    try {
      const data = JSON.parse(evt.data) as RunningLiveEvent
      onEvent(data)
    } catch {
      // ignore malformed messages
    }
  }
  es.onerror = () => {
    es.close()
  }
  return () => {
    es.close()
  }
}

// ---- Athlete workout detail (Go API) ----

export interface AthleteWorkoutDetailExercise {
  id: string
  name: string
  sets: number
  reps: number
  weightKg?: number
  restSeconds?: number
  sortOrder: number
  notes?: string
  mode?: string
  phase?: string
  bodyPart?: string
  muscleGroups?: string
  videoUrl?: string
  imageUrl?: string
  gpsRoute?: string
}

export interface AthleteWorkoutDetail {
  workout: {
    id: string
    athleteId: string
    athleteName?: string
    contentName: string
    modality?: string
    startDate: string
    endDate: string
    status: string
    progress: number
    coachId?: string
  }
  exercises: AthleteWorkoutDetailExercise[]
}

/** Full detail of an assigned workout for the authenticated athlete. */
export const getAthleteWorkoutDetail = (workoutId: string) =>
  goFetch<AthleteWorkoutDetail>(`/api/v1/workouts/${workoutId}`)

// ---- Workout AI insights (Go API) ----

export interface AIExerciseInsight {
  exercise_id: string
  name: string
  prescribed_sets: number
  prescribed_reps: number
  suggested_weight_kg: number
  suggested_reps: number
  target_rir: number
  one_rm_kg: number
  plateau: boolean
  fatigue_score: number
  confidence: number
  reason: string
}

export interface WorkoutAIInsights {
  workout_id: string
  exercises: AIExerciseInsight[]
  generated_at: string
}

/** Per-exercise AI suggestions for an assigned workout (athlete-owned). */
export const getWorkoutAIInsights = (workoutId: string) =>
  goFetch<WorkoutAIInsights>(`/api/v1/workouts/${workoutId}/ai-insights`)

// ---- Helpers ----

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

// ---- Re-export Go API client for direct usage ----
// Use this when you need to call the Go API directly (e.g., for new features).
// Example: import { goClient, goFetch } from '@/features/shared/api/client'
export { goClient, goFetch } from '@/lib/api/go-client'

// Named export for direct import (used in coach earnings page)
export const subscribeEarningsLive = coachingApi.subscribeEarningsLive
