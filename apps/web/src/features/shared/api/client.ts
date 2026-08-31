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

// Go API base URL (same as go-client.ts, used for health checks)
const GO_API_BASE = process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:8080'

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
    if (!token) token = localStorage.getItem('mr-training-auth-token');
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
  create: (data: { name: string; description: string; sportType: string; scheduledDate: string; athleteId: string; programId?: string; exercises: unknown[] }) =>
    // Go API: POST /api/v1/workouts/assign
    goFetch<Workout>('/api/v1/workouts/assign', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        sportType: data.sportType,
        scheduledDate: data.scheduledDate,
        athleteId: data.athleteId,
        programId: data.programId,
        exercises: data.exercises,
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
    return goFetch<Workout[]>(`/api/v1/workouts${qs ? `?${qs}` : ''}`).catch(() =>
      nextFetch.get<Workout[]>(`/api/athlete/workouts${qs ? `?${qs}` : ''}`)
    );
  },

  getTodayWorkout: (_athleteId: string) =>
    // Next.js: /api/athlete/today (not in Go API)
    nextFetch.get<Workout>('/api/athlete/today'),

  getPendingReviews: () =>
    // Go API: GET /api/v1/workouts (coach view)
    goFetch<Workout[]>('/api/v1/workouts').catch(() =>
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

// Coach API — Go backend (primary) with Next.js fallback.
// Go endpoints: /api/v1/users/me, /api/v1/coaches/me
// Next.js fallback: /api/coach/profile
export const coachApi = {
  getProfile: () =>
    // Go API: GET /api/v1/users/me (returns user with coach profile)
    goFetch<CoachProfile>('/api/v1/users/me').catch(() =>
      nextFetch.get<CoachProfile>('/api/coach/profile')
    ),

  updateProfile: (data: Partial<CoachProfile>) =>
    // Go API: PUT /api/v1/coaches/me
    goFetch<CoachProfile>('/api/v1/coaches/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }).catch(() =>
      nextFetch.put<CoachProfile>('/api/coach/profile', data)
    ),
};

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
    goFetch<T>('/api/v1/coaches/me/athletes').catch(() =>
      coachingFetch.get<T>(`${COACHING_BASE}/athletes`)
    ),
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
  getEvents: <T>() =>
    // Go API: GET /api/v1/events
    goFetch<T>('/api/v1/events').catch(() =>
      coachingFetch.get<T>(`${COACHING_BASE}/events`)
    ),
  saveEvent: <T>(data: unknown) =>
    // Go API: POST /api/v1/events
    goFetch<T>('/api/v1/events', { method: 'POST', body: JSON.stringify(data) }).catch(() =>
      coachingFetch.post<T>(`${COACHING_BASE}/events`, data)
    ),
  updateEvent: <T>(id: string, data: unknown) =>
    // Go API: PUT /api/v1/events/:id
    goFetch<T>(`/api/v1/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }).catch(() =>
      coachingFetch.put<T>(`${COACHING_BASE}/events/${id}`, data)
    ),
  deleteEvent: <T>(id: string) =>
    // Go API: DELETE /api/v1/events/:id
    goFetch<T>(`/api/v1/events/${id}`, { method: 'DELETE' }).catch(() =>
      coachingFetch.delete<T>(`${COACHING_BASE}/events/${id}`)
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

  // Products — Go API (primary) with Next.js fallback
  getProducts: <T>() =>
    // Go API: GET /api/v1/products
    goFetch<T>('/api/v1/products').catch(() =>
      coachingFetch.get<T>(`${COACHING_BASE}/products`)
    ),
  saveProduct: <T>(data: unknown) =>
    // Go API: POST /api/v1/products
    goFetch<T>('/api/v1/products', { method: 'POST', body: JSON.stringify(data) }).catch(() =>
      coachingFetch.post<T>(`${COACHING_BASE}/products`, data)
    ),
  updateProduct: <T>(id: string, data: unknown) =>
    // Go API: PUT /api/v1/products/:id
    goFetch<T>(`/api/v1/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }).catch(() =>
      coachingFetch.put<T>(`${COACHING_BASE}/products/${id}`, data)
    ),
  deleteProduct: <T>(id: string) =>
    // Go API: DELETE /api/v1/products/:id
    goFetch<T>(`/api/v1/products/${id}`, { method: 'DELETE' }).catch(() =>
      coachingFetch.delete<T>(`${COACHING_BASE}/products/${id}`)
    ),

  // Blog (not in Go API yet — Next.js fallback)
  getBlogPosts: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/blog`),
  getBlogPost: <T>(slug: string) => coachingFetch.get<T>(`${COACHING_BASE}/blog/${slug}`),
  saveBlogPost: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/blog`, data),
  updateBlogPost: <T>(id: string, data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/blog/${id}`, data),
  deleteBlogPost: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/blog/${id}`),

  // Public Products (not in Go API yet — Next.js fallback)
  getPublicProducts: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/public-products`),

  // Sales — Go API (primary) with Next.js fallback
  getSales: <T>() =>
    // Go API: GET /api/v1/coaches/sales
    goFetch<T>('/api/v1/coaches/sales').catch(() =>
      coachingFetch.get<T>(`${COACHING_BASE}/sales`)
    ),
  saveSale: <T>(data: unknown) =>
    // Go API: POST /api/v1/coaches/sales
    goFetch<T>('/api/v1/coaches/sales', { method: 'POST', body: JSON.stringify(data) }).catch(() =>
      coachingFetch.post<T>(`${COACHING_BASE}/sales`, data)
    ),
  deleteSale: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/sales/${id}`),

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
    // Go API: GET /api/v1/memberships
    goFetch<T>('/api/v1/memberships').catch(() =>
      coachingFetch.get<T>(`${COACHING_BASE}/memberships`)
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
  getHealth: (athleteId: string, days = 14) =>
    // Next.js: /api/coach/athletes/:id/health (not in Go API)
    nextFetch.get<AthleteHealthResponse>(`/api/coach/athletes/${athleteId}/health?days=${days}`),

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

// Exercise API — Go backend (primary) with Next.js fallback.
// Go endpoints: /api/v1/exercises
// Next.js fallback: /api/exercises
export const exerciseApi = {
  list: () =>
    // Go API: GET /api/v1/exercises
    goFetch<{ exercises: ExerciseLibraryEntry[] }>('/api/v1/exercises').catch(() =>
      nextFetch.get<{ exercises: ExerciseLibraryEntry[] }>('/api/exercises')
    ),

  create: (data: Partial<ExerciseLibraryEntry>) =>
    // Go API: POST /api/v1/exercises (coach only)
    goFetch<{ exercise: ExerciseLibraryEntry }>('/api/v1/exercises', {
      method: 'POST',
      body: JSON.stringify(data),
    }).catch(() =>
      nextFetch.post<{ exercise: ExerciseLibraryEntry }>('/api/exercises', data)
    ),
};

export interface HealthSeriesRow {
  value: number;
  unit: string;
  source: string;
  recordedAt: string;
}

export interface SleepNightRow {
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

export interface AthleteHealthResponse {
  athleteId: string;
  windowDays: number;
  hrv: HealthSeriesRow[];
  restingHr: HealthSeriesRow[];
  steps: HealthSeriesRow[];
  vo2max: HealthSeriesRow[];
  activeCalories: HealthSeriesRow[];
  manualReadiness: HealthSeriesRow[];
  sleepLogs: SleepNightRow[];
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
    goFetch<{ templates: WorkoutTemplateSummary[] }>('/api/v1/workout-templates').catch(() =>
      nextFetch.get<{ templates: WorkoutTemplateSummary[] }>('/api/coach/workout-templates')
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
