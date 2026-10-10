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
 *   - /api/polar/*              — Payments (Polar.sh)
 */
import { goClient, goFetch } from '@/lib/api/go-client'
import type { CoachEvent } from '@/features/coach/types'
import type { Product } from '@/features/coach/types'
import type { Sale } from '@/features/coach/types'

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
    // Go API: GET /api/v1/workouts/:id (if available, else fallback)
    goFetch<Workout>(`/api/v1/workouts/${id}`).catch(() =>
      nextFetch.get<Workout>(`/api/coaching/assigned-workouts/${id}`)
    ),

  complete: (id: string, data: { rpe: number; notes: string }) =>
    // Go API: POST /api/v1/workouts/:id/sets (log completion)
    goFetch<Workout>(`/api/v1/workouts/${id}/sets`, {
      method: 'POST',
      body: JSON.stringify({ rpe: data.rpe, notes: data.notes, completed: true }),
    }).catch(() =>
      nextFetch.put<Workout>(`/api/coaching/assigned-workouts/${id}`, { status: 'completed', rpe: data.rpe, notes: data.notes } as unknown)
    ),

  getAthleteWorkouts: (athleteId: string, dateFrom?: string, dateTo?: string) => {
    // Go API: GET /api/v1/workouts
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    const qs = params.toString();
    void athleteId; // Go API uses auth-derived athlete
    return goFetch<{ data: Workout[] }>(`/api/v1/workouts${qs ? `?${qs}` : ''}`).then(r => r.data).catch(() =>
      nextFetch.get<Workout[]>(`/api/athlete/workouts${qs ? `?${qs}` : ''}`)
    );
  },

  getTodayWorkout: (_athleteId: string) =>
    // Next.js: /api/athlete/today (not in Go API)
    nextFetch.get<Workout>('/api/athlete/today'),

  getPendingReviews: () =>
    // Go API: GET /api/v1/workouts (coach view)
    goFetch<{ data: Workout[] }>('/api/v1/workouts').then(r => r.data).catch(() =>
      nextFetch.get<Workout[]>('/api/coaching/assigned-workouts')
    ),
};

// Coach API
export interface CoachProfile {
  id: string;
  userId: string;
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
  running_distance_km?: number | null;
  running_pace?: string;
  running_meeting_point?: string;
  athlete_ids: string[];
  form_fields?: GoFormField[];
  list_items?: string[];
  coach_id: string;
  created_at: string;
  updated_at: string;
};

// Exported for server-side prefetch (see src/app/(app)/coach/page.tsx) — the
// RSC must apply the exact same mapping so hydrated data matches client shape.
export function mapGoEvent(g: GoEvent): CoachEvent {
  const hasRunning =
    g.running_distance_km != null || !!g.running_pace || !!g.running_meeting_point;
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
    athlete_ids: e.athleteIds ?? [],
    list_items: e.listItems ?? [],
    form_fields: (e.formFields ?? []).map((f) => ({
      id: f.id,
      label: f.label,
      kind: f.kind,
      options: f.options ?? [],
      required: !!f.required,
    })),
    running_distance_km: e.running?.distanceKm,
    running_pace: e.running?.pace,
    running_meeting_point: e.running?.meetingPoint,
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

  // Athletes — Go API (primary) with Next.js fallback
  getAthletes: <T>() =>
    // Go API: GET /api/v1/coaches/:id/athletes (auth-derived coach ID)
    // Response format: { data: T[], total: number, page: number, limit: number }
    // T is the element type (e.g., AthleteBrief), not the array type
    goFetch<{ data: T[]; total: number; page: number; limit: number }>('/api/v1/coaches/me/athletes')
      .then((res) => (Array.isArray(res) ? res : res.data))
      .catch(() =>
        coachingFetch.get<T[]>(`${COACHING_BASE}/athletes`)
      ) as Promise<T[]>,
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

  // Events — Go API (primary) with Next.js fallback
  getEvents: () =>
    // Go API: GET /api/v1/events (returns { data: [snake_case] })
    goFetch<{ data?: GoEvent[] }>('/api/v1/events')
      .catch(() => coachingFetch.get<CoachEvent[]>(`${COACHING_BASE}/events`))
      .then((res) => (Array.isArray(res) ? res : (res.data ?? []).map(mapGoEvent))),
  saveEvent: (event: CoachEvent) =>
    // Go API: POST /api/v1/events (sends snake_case payload)
    goFetch<{ id: string }>('/api/v1/events', {
      method: 'POST',
      body: JSON.stringify(toGoEvent(event)),
    }).catch(() => coachingFetch.post<{ id: string }>(`${COACHING_BASE}/events`, event)),
  updateEvent: (id: string, event: CoachEvent) =>
    // Go API: PUT /api/v1/events/:id (sends snake_case payload)
    goFetch<{ ok: boolean }>(`/api/v1/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toGoEvent(event)),
    }).catch(() => coachingFetch.put<{ ok: boolean }>(`${COACHING_BASE}/events/${id}`, event)),
  deleteEvent: (id: string) =>
    // Go API: DELETE /api/v1/events/:id
    goFetch<{ ok: boolean }>(`/api/v1/events/${id}`, { method: 'DELETE' }).catch(() =>
      coachingFetch.delete<{ ok: boolean }>(`${COACHING_BASE}/events/${id}`)
    ),
  // Event RSVP — Go API
  rsvpEvent: (eventId: string, data: { token?: string; status: 'accepted' | 'cancelled'; name?: string; email?: string; phone?: string }) =>
    // Go API: POST /api/v1/events/:id/rsvp
    goFetch<{ token: string; status: string }>(`/api/v1/events/${eventId}/rsvp`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).catch(() =>
      coachingFetch.post<{ token: string; status: string }>(`${COACHING_BASE}/events/${eventId}/rsvp`, data)
    ),

  // Plans (not in Go API yet — Next.js fallback)
  getPlans: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/plans`),
  savePlan: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/plans`, data),
  updatePlan: <T>(id: string, data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/plans/${id}`, data),
  deletePlan: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/plans/${id}`),

  // Tickets (not in Go API yet — Next.js fallback)
  getTickets: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/tickets`),
  saveTicket: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/tickets`, data),

  // Assigned Workouts — Go API (primary) with Next.js fallback
  getAssignedWorkouts: <T>() =>
    // Go API: GET /api/v1/workouts
    goFetch<T>('/api/v1/workouts').catch(() =>
      coachingFetch.get<T>(`${COACHING_BASE}/assigned-workouts`)
    ),
  saveAssignedWorkout: <T>(data: unknown) =>
    // Go API: POST /api/v1/workouts/assign
    goFetch<T>('/api/v1/workouts/assign', { method: 'POST', body: JSON.stringify(data) }).catch(() =>
      coachingFetch.post<T>(`${COACHING_BASE}/assigned-workouts`, data)
    ),
  updateAssignedWorkout: <T>(id: string, data: unknown) =>
    // Go API: POST /api/v1/workouts/:id/sets (update workout)
    goFetch<T>(`/api/v1/workouts/${id}/sets`, { method: 'POST', body: JSON.stringify(data) }).catch(() =>
      coachingFetch.put<T>(`${COACHING_BASE}/assigned-workouts/${id}`, data)
    ),
  deleteAssignedWorkout: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/assigned-workouts/${id}`),

  // AI Suggestions (not in Go API yet — Next.js fallback)
  getAISuggestions: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/ai-suggestions`),
  saveAISuggestion: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/ai-suggestions`, data),

  // Live Sessions (not in Go API yet — Next.js fallback)
  getLiveSessions: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/live-sessions`),
  saveLiveSession: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/live-sessions`, data),
  updateLiveSession: <T>(id: string, data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/live-sessions/${id}`, data),
  deleteLiveSession: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/live-sessions/${id}`),

  // Products — Go API (primary)
  getProducts: () =>
    // Go API: GET /api/v1/products
    goFetch<{ data: Product[] }>('/api/v1/products').then(res => res.data),
  saveProduct: (data: Omit<Product, 'id' | 'createdAt'>) =>
    // Go API: POST /api/v1/products
    goFetch<{ id: string }>('/api/v1/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Partial<Product>) =>
    // Go API: PUT /api/v1/products/:id
    goFetch<{ ok: boolean }>(`/api/v1/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) =>
    // Go API: DELETE /api/v1/products/:id
    goFetch<{ ok: boolean }>(`/api/v1/products/${id}`, { method: 'DELETE' }),

  // Public Products (not in Go API yet — Next.js fallback)
  getPublicProducts: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/public-products`),

  // Sales — Go API (primary)
  getSales: () =>
    // Go API: GET /api/v1/coaches/sales
    goFetch<{ data: Sale[] }>('/api/v1/coaches/sales').then(res => res.data),
  saveSale: (data: Omit<Sale, 'id' | 'createdAt'>) =>
    // Go API: POST /api/v1/coaches/sales
    goFetch<{ id: string }>('/api/v1/coaches/sales', { method: 'POST', body: JSON.stringify(data) }),
  deleteSale: (id: string) =>
    // Go API: DELETE /api/v1/coaches/sales/:id
    goFetch<{ ok: boolean }>(`/api/v1/coaches/sales/${id}`, { method: 'DELETE' }),

  // Dashboard (not in Go API yet — Next.js fallback)
  getDashboard: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/dashboard`),

  // Payment Methods (not in Go API yet — Next.js fallback)
  getPaymentMethods: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/payment-methods`),
  savePaymentMethod: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/payment-methods`, data),
  updatePaymentMethod: <T>(id: string, data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/payment-methods/${id}`, data),
  deletePaymentMethod: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/payment-methods/${id}`),

  // Public Page Config (not in Go API yet — Next.js fallback)
  getPublicPageConfig: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/public-page`),
  updatePublicPageConfig: <T>(data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/public-page`, data),

  // Memberships — Go API (primary) with Next.js fallback
  getMemberships: <T>() =>
    // Go API: GET /api/v1/memberships (athlete's own membership)
    goFetch<T>('/api/v1/memberships').catch(() =>
      coachingFetch.get<T>(`${COACHING_BASE}/memberships`)
    ),
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
      .catch(() =>
        coachingFetch.get<T[]>(`${COACHING_BASE}/memberships`)
      ),
  getMembership: <T>(athleteId: string) =>
    // Go API: GET /api/v1/memberships (auth-derived)
    goFetch<T>('/api/v1/memberships').catch(() =>
      coachingFetch.get<T>(`${COACHING_BASE}/membership/${athleteId}`)
    ),
  createMembership: <T>(data: unknown) =>
    // Go API: POST /api/v1/memberships
    goFetch<T>('/api/v1/memberships', { method: 'POST', body: JSON.stringify(data) }).catch(() =>
      coachingFetch.post<T>(`${COACHING_BASE}/membership`, data)
    ),
  cancelMembership: <T>(id: string) =>
    // Go API: PUT /api/v1/memberships/:id/cancel
    goFetch<T>(`/api/v1/memberships/${id}/cancel`, { method: 'PUT' }).catch(() =>
      coachingFetch.delete<T>(`${COACHING_BASE}/membership/${id}`)
    ),
  getPaymentHistory: <T>(athleteId: string) =>
    // Go API: GET /api/v1/memberships/:id/payments
    goFetch<T>(`/api/v1/memberships/${athleteId}/payments`).catch(() =>
      coachingFetch.get<T>(`${COACHING_BASE}/payment-history/${athleteId}`)
    ),

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

// Training API — Go backend (primary) with Next.js fallback.
// Go endpoints: /api/v1/progress, /api/v1/exercises
// Next.js fallback: /api/coach/athletes/:id/*, /api/coach/video-analytics
export const trainingApi = {
  getTrainingSummary: (athleteId: string, days = 28) =>
    // Next.js: /api/coach/athletes/:id/training-summary (not in Go API)
    nextFetch.get<TrainingSummaryResponse>(`/api/coach/athletes/${athleteId}/training-summary?days=${days}`),

  getOneRm: (athleteId: string) =>
    // Next.js: /api/coach/athletes/:id/one-rm (not in Go API)
    nextFetch.get<OneRmResponse>(`/api/coach/athletes/${athleteId}/one-rm`),

  getFatigueMap: (athleteId: string, days = 7) =>
    // Next.js: /api/coach/athletes/:id/fatigue-map (not in Go API)
    nextFetch.get<FatigueMapResponse>(`/api/coach/athletes/${athleteId}/fatigue-map?days=${days}`),

  getEffort: (athleteId: string, days = 28) =>
    // Next.js: /api/coach/athletes/:id/effort (not in Go API)
    nextFetch.get<EffortResponse>(`/api/coach/athletes/${athleteId}/effort?days=${days}`),

  /** Wearable-derived health signals (HRV/RHR/steps/sleep) for one athlete. */
  getHealth: async (athleteId: string, days = 14): Promise<AthleteHealthResponse> => {
    const [metrics, sleepLogs, devices] = await Promise.all([
      goFetch<HealthMetric[]>(`/health/metrics?athlete_id=${athleteId}&days=${days}`),
      goFetch<SleepLog[]>(`/health/sleep?athlete_id=${athleteId}&days=${days}`),
      goFetch<HealthDevice[]>(`/health/devices?athlete_id=${athleteId}`),
    ]);

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

    return {
      metrics,
      sleepLogs,
      devices,
      hrv,
      restingHr,
      manualReadiness,
      windowDays: days,
    };
  },

  /** HR zone distribution for a time window (e.g., during a workout). */
  getHrZones: (athleteId: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    // Next.js: /api/coach/athletes/:id/hr-zones (not in Go API)
    return nextFetch.get<{ hrZones: HRZoneRow; sampleCount: number }>(
      `/api/coach/athletes/${athleteId}/hr-zones?${params.toString()}`
    );
  },

  /** Aggregate video view analytics across all exercises. */
  getVideoAnalytics: () =>
    // Next.js: /api/coach/video-analytics (not in Go API)
    nextFetch.get<{ analytics: VideoAnalyticsRow[] }>('/api/coach/video-analytics'),
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
// Go endpoints: GET /video-analytics/summary, GET /video-analytics/per-exercise, GET /video-analytics/sessions, POST /video-analytics/track
export const videoAnalyticsApi = {
  getSummary: () =>
    // Go API: GET /video-analytics/summary
    goFetch<VideoAnalyticsSummary>('/video-analytics/summary'),

  getPerExercise: () =>
    // Go API: GET /video-analytics/per-exercise
    goFetch<ExerciseAnalytics[]>('/video-analytics/per-exercise'),

  getSessions: () =>
    // Go API: GET /video-analytics/sessions
    goFetch<SessionAnalysis[]>('/video-analytics/sessions'),

  trackSession: (data: { workoutId: string; exerciseId: string; durationSec: number; repCount: number; avgFormScore: number; minFormScore: number; maxFormScore: number; videoUrl?: string }) =>
    // Go API: POST /video-analytics/track
    goFetch<SessionAnalysis>('/video-analytics/track', {
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

  uploadVideo: async (file: File) => {
    // Video upload uses multipart/form-data; auth relies on the Clerk session
    // cookie (the route verifies it via auth()) — no token in localStorage.
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/exercises/upload', {
      method: 'POST',
      body: form,
    })
    if (!res.ok) throw new Error('Upload failed')
    return res.json()
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
  muscleGroups?: string[];
  libraryExerciseId?: string | null;
  /** Running route as an encoded GPS polyline (lat,lng pairs). */
  gpsRoute?: string | null;
}

export interface WorkoutTemplateDetail extends WorkoutTemplateSummary {
  coachId: string;
  exercises: Array<TemplateExerciseRow & {
    id: string;
    name: string;
    sets: number;
    reps: number;
    sortOrder: number;
    mode: 'reps' | 'time' | 'cardio';
    phase: 'work' | 'warmup';
  }>;
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

// Template API — Go backend (primary) with Next.js fallback.
// Go endpoints: /api/v1/workout-templates
// Next.js fallback: /api/coach/workout-templates, /api/coaching/assigned-workouts
export const templateApi = {
  list: () =>
    // Go API: GET /api/v1/workout-templates
    // Go returns { data: [...] }; older Next route returns { templates: [...] }.
    goFetch<{ templates?: WorkoutTemplateSummary[]; data?: WorkoutTemplateSummary[] }>('/api/v1/workout-templates')
      .then((res) => res.data ?? res.templates ?? [])
      .catch(() =>
        nextFetch.get<{ templates: WorkoutTemplateSummary[] }>('/api/coach/workout-templates')
          .then((res) => res.templates)
      ),

  get: (id: string) =>
    // Go API: GET /api/v1/workout-templates/:id
    goFetch<{ template: WorkoutTemplateDetail }>(`/api/v1/workout-templates/${id}`).catch(() =>
      nextFetch.get<{ template: WorkoutTemplateDetail }>(`/api/coach/workout-templates/${id}`)
    ),

  create: (data: { name: string; description?: string; goal?: string; estimatedDurationMinutes?: number | null; exercises?: TemplateExerciseRow[]; id?: string }) =>
    // Go API: POST /api/v1/workout-templates
    goFetch<{ id: string }>('/api/v1/workout-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }).catch(() =>
      nextFetch.post<{ id: string }>('/api/coach/workout-templates', data)
    ),

  update: (id: string, data: { name: string; description?: string; goal?: string; estimatedDurationMinutes?: number | null; exercises?: TemplateExerciseRow[] }) =>
    // Go API: PUT /api/v1/workout-templates/:id (if available)
    goFetch<{ id: string }>(`/api/v1/workout-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).catch(() =>
      nextFetch.put<{ id: string }>(`/api/coach/workout-templates/${id}`, data)
    ),

  remove: (id: string) =>
    // Next.js: DELETE /api/coach/workout-templates/:id (not in Go API)
    nextFetch.delete<{ ok: true }>(`/api/coach/workout-templates/${id}`),

  /** Full detail of a previously assigned workout, for reassignment flows. */
  getPastAssignment: (id: string) =>
    // Go API: GET /api/v1/workouts/:id
    goFetch<PastAssignmentDetail>(`/api/v1/workouts/${id}`).catch(() =>
      nextFetch.get<PastAssignmentDetail>(`/api/coaching/assigned-workouts/${id}`)
    ),

  /** Coach's assignment history (list view, no exercises). */
  listPastAssignments: () =>
    // Go API: GET /api/v1/workouts
    goFetch<PastAssignmentListItem[]>('/api/v1/workouts').catch(() =>
      nextFetch.get<PastAssignmentListItem[]>('/api/coaching/assigned-workouts')
    ),
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

// ---- Re-export Go API client for direct usage ----
// Use this when you need to call the Go API directly (e.g., for new features).
// Example: import { goClient, goFetch } from '@/features/shared/api/client'
export { goClient, goFetch } from '@/lib/api/go-client'
