// All Next.js API routes are same-origin — no host hardcode needed.
// NEXT_PUBLIC_API_URL (Go at :8080) is deprecated and must not be used.
// Go backend at localhost:8080/api/v1 has been deleted (migrated to Next.js).
// @deprecated LEGACY_API_BASE is kept only for backwards-compat of the legacy `api` helper.
// New code must use `nextRequest` / `coachingRequest` (same-origin, no host).
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

// Workout API — migrated to same-origin Next.js routes.
// Go legacy was /workouts, /athletes/:id/workouts etc. (localhost:8080/api/v1).
// Next.js equivalents: /api/coaching/assigned-workouts + /api/athlete/workouts + /api/athlete/today
export const workoutApi = {
  create: (data: { name: string; description: string; sportType: string; scheduledDate: string; athleteId: string; programId?: string; exercises: unknown[] }) =>
    // Map legacy Go payload (name/description/sportType/scheduledDate/athleteId/exercises)
    // to Next.js assigned-workouts shape; server accepts Record<string,unknown> so extra fields are safe.
    // We keep athleteId for FK and add derived fields for the coaching DB table.
    nextFetch.post<Workout>('/api/coaching/assigned-workouts', {
      athleteId: data.athleteId,
      contentName: data.name,
      contentType: data.programId ? 'program' : 'workout',
      contentId: data.programId || data.name,
      modality: data.sportType,
      startDate: data.scheduledDate,
      endDate: data.scheduledDate,
      daysOfWeek: [],
      status: 'active',
      progress: 0,
      // keep original fields for backwards-compat / debugging
      name: data.name,
      description: data.description,
      sportType: data.sportType,
      scheduledDate: data.scheduledDate,
      programId: data.programId,
      exercises: data.exercises,
    } as unknown),

  getById: (id: string) => nextFetch.get<Workout>(`/api/coaching/assigned-workouts/${id}`),

  complete: (id: string, data: { rpe: number; notes: string }) =>
    // Legacy POST /workouts/:id/complete -> Next.js PUT with status/progress
    nextFetch.put<Workout>(`/api/coaching/assigned-workouts/${id}`, { status: 'completed', rpe: data.rpe, notes: data.notes } as unknown),

  getAthleteWorkouts: (athleteId: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    const qs = params.toString();
    // Next.js /api/athlete/workouts is auth-derived (no athleteId in path); keep query params for filtering.
    // athleteId is kept in signature for compat but not used in URL — auth determines athlete.
    void athleteId;
    return nextFetch.get<Workout[]>(`/api/athlete/workouts${qs ? `?${qs}` : ''}`);
  },

  getTodayWorkout: (_athleteId: string) => nextFetch.get<Workout>('/api/athlete/today'),

  getPendingReviews: () => nextFetch.get<Workout[]>('/api/coaching/assigned-workouts'),
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

// Coach API — migrated to same-origin Next.js route /api/coach/profile (see src/app/api/coach/profile/route.ts)
export const coachApi = {
  getProfile: () => nextFetch.get<CoachProfile>('/api/coach/profile'),
  updateProfile: (data: Partial<CoachProfile>) => nextFetch.put<CoachProfile>('/api/coach/profile', data),
};

// ---- Coaching API (Next.js API routes -> TursoDB) ----
// Always same-origin: React runs on Vercel, /api/* is on same host. No host hardcode.
const COACHING_BASE = '/api/coaching'

// Reuse same-origin helper — coachingRequest is an alias to nextRequest
const coachingRequest = nextRequest
const coachingFetch = nextFetch

export const coachingApi = {
  // Time Blocks
  getTimeBlocks: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/time-blocks`),
  saveTimeBlocks: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/time-blocks`, data),

  // Athletes
  getAthletes: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/athletes`),
  getAthleteById: <T>(id: string) => coachingFetch.get<T>(`${COACHING_BASE}/athletes/${id}`),
  saveAthlete: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/athletes`, data),
  updateAthlete: <T>(id: string, data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/athletes/${id}`, data),
  deleteAthlete: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/athletes/${id}`),

  // Sessions
  getSessions: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/sessions`),
  saveSession: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/sessions`, data),
  updateSession: <T>(id: string, data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/sessions/${id}`, data),
  deleteSession: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/sessions/${id}`),

  // Messages
  getMessageThreads: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/messages`),
  sendMessage: <T>(threadId: string, data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/messages/${threadId}`, data),
  createThread: <T>(data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/messages`, data),

  // Daily Summary
  getDailySummary: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/daily-summary`),

  // Events
  getEvents: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/events`),
  saveEvent: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/events`, data),
  updateEvent: <T>(id: string, data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/events/${id}`, data),
  deleteEvent: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/events/${id}`),

  // Plans
  getPlans: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/plans`),
  savePlan: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/plans`, data),
  updatePlan: <T>(id: string, data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/plans/${id}`, data),
  deletePlan: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/plans/${id}`),

  // Tickets
  getTickets: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/tickets`),
  saveTicket: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/tickets`, data),

  // Assigned Workouts
  getAssignedWorkouts: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/assigned-workouts`),
  saveAssignedWorkout: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/assigned-workouts`, data),
  updateAssignedWorkout: <T>(id: string, data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/assigned-workouts/${id}`, data),
  deleteAssignedWorkout: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/assigned-workouts/${id}`),

  // AI Suggestions
  getAISuggestions: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/ai-suggestions`),
  saveAISuggestion: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/ai-suggestions`, data),

  // Live Sessions
  getLiveSessions: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/live-sessions`),
  saveLiveSession: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/live-sessions`, data),
  updateLiveSession: <T>(id: string, data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/live-sessions/${id}`, data),
  deleteLiveSession: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/live-sessions/${id}`),

  // Products
  getProducts: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/products`),
  saveProduct: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/products`, data),
  updateProduct: <T>(id: string, data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/products/${id}`, data),
  deleteProduct: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/products/${id}`),

  // Blog
  getBlogPosts: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/blog`),
  getBlogPost: <T>(slug: string) => coachingFetch.get<T>(`${COACHING_BASE}/blog/${slug}`),
  saveBlogPost: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/blog`, data),
  updateBlogPost: <T>(id: string, data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/blog/${id}`, data),
  deleteBlogPost: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/blog/${id}`),

  // Public Products
  getPublicProducts: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/public-products`),

  // Sales
  getSales: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/sales`),
  saveSale: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/sales`, data),
  deleteSale: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/sales/${id}`),

  // Dashboard
  getDashboard: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/dashboard`),

  // Payment Methods
  getPaymentMethods: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/payment-methods`),
  savePaymentMethod: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/payment-methods`, data),
  updatePaymentMethod: <T>(id: string, data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/payment-methods/${id}`, data),
  deletePaymentMethod: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/payment-methods/${id}`),

  // Public Page Config
  getPublicPageConfig: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/public-page`),
  updatePublicPageConfig: <T>(data: unknown) => coachingFetch.put<T>(`${COACHING_BASE}/public-page`, data),

  // Memberships
  getMemberships: <T>() => coachingFetch.get<T>(`${COACHING_BASE}/memberships`),
  getMembership: <T>(athleteId: string) => coachingFetch.get<T>(`${COACHING_BASE}/membership/${athleteId}`),
  createMembership: <T>(data: unknown) => coachingFetch.post<T>(`${COACHING_BASE}/membership`, data),
  cancelMembership: <T>(id: string) => coachingFetch.delete<T>(`${COACHING_BASE}/membership/${id}`),
  getPaymentHistory: <T>(athleteId: string) => coachingFetch.get<T>(`${COACHING_BASE}/payment-history/${athleteId}`),

  // Generic get for dynamic paths
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

export const trainingApi = {
  getTrainingSummary: (athleteId: string, days = 28) =>
    nextFetch.get<TrainingSummaryResponse>(`/api/coach/athletes/${athleteId}/training-summary?days=${days}`),
  getOneRm: (athleteId: string) =>
    nextFetch.get<OneRmResponse>(`/api/coach/athletes/${athleteId}/one-rm`),
  getFatigueMap: (athleteId: string, days = 7) =>
    nextFetch.get<FatigueMapResponse>(`/api/coach/athletes/${athleteId}/fatigue-map?days=${days}`),
  getEffort: (athleteId: string, days = 28) =>
    nextFetch.get<EffortResponse>(`/api/coach/athletes/${athleteId}/effort?days=${days}`),
  /** Wearable-derived health signals (HRV/RHR/steps/sleep) for one athlete. */
  getHealth: (athleteId: string, days = 14) =>
    nextFetch.get<AthleteHealthResponse>(`/api/coach/athletes/${athleteId}/health?days=${days}`),
  /** HR zone distribution for a time window (e.g., during a workout). */
  getHrZones: (athleteId: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return nextFetch.get<{ hrZones: HRZoneRow; sampleCount: number }>(
      `/api/coach/athletes/${athleteId}/hr-zones?${params.toString()}`
    );
  },
  /** Aggregate video view analytics across all exercises. */
  getVideoAnalytics: () =>
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

export const exerciseApi = {
  list: () => nextFetch.get<{ exercises: ExerciseLibraryEntry[] }>('/api/exercises'),
  create: (data: Partial<ExerciseLibraryEntry>) =>
    nextFetch.post<{ exercise: ExerciseLibraryEntry }>('/api/exercises', data),
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

export const templateApi = {
  list: () => nextFetch.get<{ templates: WorkoutTemplateSummary[] }>('/api/coach/workout-templates'),
  get: (id: string) => nextFetch.get<{ template: WorkoutTemplateDetail }>(`/api/coach/workout-templates/${id}`),
  create: (data: { name: string; description?: string; goal?: string; estimatedDurationMinutes?: number | null; exercises?: TemplateExerciseRow[] }) =>
    nextFetch.post<{ id: string }>('/api/coach/workout-templates', data),
  remove: (id: string) => nextFetch.delete<{ ok: true }>(`/api/coach/workout-templates/${id}`),
  /** Full detail of a previously assigned workout, for reassignment flows. */
  getPastAssignment: (id: string) => nextFetch.get<PastAssignmentDetail>(`/api/coaching/assigned-workouts/${id}`),
  /** Coach's assignment history (list view, no exercises). */
  listPastAssignments: () => nextFetch.get<PastAssignmentListItem[]>('/api/coaching/assigned-workouts'),
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
